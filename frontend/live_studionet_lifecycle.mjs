import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createAccount, createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'
import { createPublicClient, formatEther, http } from 'viem'

const rpc = 'https://studio.genlayer.com/api'
const contractAddress = process.env.BIDFRAME_CONTRACT_ADDRESS
const owner = createAccount(process.env.BIDFRAME_LANDLORD_PRIVATE_KEY)
const tenant = createAccount(process.env.BIDFRAME_TENANT_PRIVATE_KEY)
const gen = 10n ** 18n
const deposit = gen
const tenantFaucetAmount = 2n * gen
const publicClient = createPublicClient({ chain: studionet, transport: http(rpc) })
const ownerClient = createClient({ chain: studionet, account: owner })
const tenantClient = createClient({ chain: studionet, account: tenant })
const evidenceLog = resolve(process.env.BIDFRAME_EVIDENCE_PATH || 'artifacts/studionet-lifecycle.json')
const records = []

function normalize(value) {
  return JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item))
}

function safeError(error) {
  const message = error && typeof error === 'object' && 'shortMessage' in error
    ? error.shortMessage
    : error && typeof error === 'object' && 'message' in error
      ? error.message
      : String(error)
  return String(message).slice(0, 500)
}

process.on('unhandledRejection', error => {
  console.error(`Lifecycle stopped: ${safeError(error)}`)
  process.exitCode = 1
})
process.on('uncaughtException', error => {
  console.error(`Lifecycle stopped: ${safeError(error)}`)
  process.exit(1)
})

function record(type, data) {
  const entry = { time: new Date().toISOString(), type, ...normalize(data) }
  records.push(entry)
  mkdirSync(dirname(evidenceLog), { recursive: true })
  writeFileSync(evidenceLog, `${JSON.stringify(records, null, 2)}\n`)
  console.log(JSON.stringify(entry))
}

function transactionSummary(tx, receipt) {
  const leaders = tx.consensus_data?.leader_receipt ?? []
  const leader = leaders.find(row => row.mode === 'leader') ?? leaders[0]
  const finalized = tx.statusName === 'FINALIZED' || receipt.statusName === 'FINALIZED' || tx.status === 7 || receipt.status === 7
  const successful = finalized && tx.result_name === 'MAJORITY_AGREE' && leader?.execution_result === 'SUCCESS' && leader.result?.status === 'return'
  return {
    finalized,
    successful,
    statusName: tx.statusName ?? receipt.statusName,
    resultName: tx.result_name,
    execution: leader?.execution_result,
    returnStatus: leader?.result?.status,
    valueCredited: tx.value_credited,
    triggeredMessages: tx.messages,
    tx,
  }
}

async function finalizedWrite(label, client, functionName, args = [], value = 0n, expectedFailure = false) {
  let hash
  try {
    hash = await client.writeContract({ address: contractAddress, functionName, args, value })
  } catch (error) {
    if (expectedFailure) {
      record('expected_write_rejected_before_submission', { label, functionName, error: safeError(error) })
      return { hash: null, expectedFailure: true, error: safeError(error) }
    }
    throw error
  }
  record('submitted', { label, functionName, hash: String(hash), valueWei: value })
  const receipt = await ownerClient.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    interval: 3000,
    retries: 600,
  })
  const tx = await ownerClient.getTransaction({ hash })
  const summary = transactionSummary(tx, receipt)
  record('finalized', {
    label,
    functionName,
    hash: String(hash),
    statusName: summary.statusName,
    resultName: summary.resultName,
    execution: summary.execution,
    returnStatus: summary.returnStatus,
    valueCredited: summary.valueCredited,
    expectedFailure,
  })
  if (!summary.finalized) throw new Error(`${label}: receipt did not reach FINALIZED.`)
  if (expectedFailure) {
    if (summary.successful) throw new Error(`${label}: expected failure but execution succeeded.`)
  } else if (!summary.successful) {
    throw new Error(`${label}: finalized without successful execution (${summary.statusName}/${summary.resultName}/${summary.execution}/${summary.returnStatus}).`)
  }
  return { hash: String(hash), receipt, tx, summary, success: summary.successful }
}

async function readAgreement(id) {
  return ownerClient.readContract({ address: contractAddress, functionName: 'get_agreement', args: [BigInt(id)] })
}

async function readItem(id, itemId) {
  return ownerClient.readContract({ address: contractAddress, functionName: 'get_item', args: [BigInt(id), BigInt(itemId)] })
}

async function balance(address) {
  return publicClient.getBalance({ address })
}

async function closeAgreementAfterUnsuccessfulDamageProof(agreementId, itemId, reason) {
  let item = await readItem(agreementId, itemId)
  if (!item.assessed) {
    if (!item.evidence_challenged) {
      const challenge = await finalizedWrite('challenge unresolved damage evidence for zero-deduction recovery', ownerClient, 'challenge_checkout_evidence', [BigInt(agreementId), BigInt(itemId)])
      record('failed_damage_proof_challenge_readback', { transaction: challenge.hash, agreementId, itemId, item: await readItem(agreementId, itemId) })
    }
    const recovery = await finalizedWrite('resolve unresolved damage evidence at zero', ownerClient, 'resolve_challenged_zero', [BigInt(agreementId), BigInt(itemId)])
    item = await readItem(agreementId, itemId)
    record('failed_damage_proof_recovery_readback', { transaction: recovery.hash, agreementId, itemId, item, agreement: await readAgreement(agreementId) })
  } else if (item.verdict === 'INCONCLUSIVE' && !item.inconclusive_resolved) {
    const recovery = await finalizedWrite('resolve damage INCONCLUSIVE at zero', ownerClient, 'resolve_inconclusive_zero', [BigInt(agreementId), BigInt(itemId)])
    item = await readItem(agreementId, itemId)
    record('failed_damage_proof_inconclusive_readback', { transaction: recovery.hash, agreementId, itemId, item, agreement: await readAgreement(agreementId) })
  }
  let agreement = await readAgreement(agreementId)
  if (agreement.status === 'ASSESSING' && agreement.assessed_count === agreement.item_count && !agreement.has_inconclusive) {
    const ready = await finalizedWrite('mark non-damage proof agreement READY', ownerClient, 'mark_ready', [BigInt(agreementId)])
    const before = { tenant: await balance(agreement.tenant), contract: await balance(contractAddress) }
    const settlement = await finalizedWrite('settle non-damage proof agreement', ownerClient, 'settle', [BigInt(agreementId)])
    const after = { tenant: await balance(agreement.tenant), contract: await balance(contractAddress) }
    agreement = await readAgreement(agreementId)
    record('non_damage_proof_safe_settlement', {
      agreementId,
      reason,
      readyTransaction: ready.hash,
      settlementTransaction: settlement.hash,
      agreement,
      tenantRefundDelta: after.tenant - before.tenant,
      contractBalanceAfter: after.contract,
    })
  }
}

if (!process.env.BIDFRAME_LANDLORD_PRIVATE_KEY || !process.env.BIDFRAME_TENANT_PRIVATE_KEY || !contractAddress) {
  throw new Error('Contract address and both local signing keys must be present in process environment.')
}
if (process.env.BIDFRAME_DEPLOYER && owner.address.toLowerCase() !== process.env.BIDFRAME_DEPLOYER.toLowerCase()) {
  throw new Error('Landlord private key does not match the declared deployment wallet.')
}
if (process.env.BIDFRAME_EXPECT_TENANT && tenant.address.toLowerCase() !== process.env.BIDFRAME_EXPECT_TENANT.toLowerCase()) {
  throw new Error('Tenant key/address mismatch.')
}
const chainId = await publicClient.getChainId()
if (chainId !== 61999) throw new Error(`Wrong chain ID: ${chainId}`)
record('network_and_parties', {
  chainId,
  rpc,
  contractAddress,
  deployer: owner.address,
  landlord: owner.address,
  tenant: tenant.address,
  sourceCommit: process.env.BIDFRAME_DEPLOYED_COMMIT,
  contractSha256: process.env.BIDFRAME_CONTRACT_SHA256,
  landlordBalanceBefore: await balance(owner.address),
  tenantBalanceBefore: await balance(tenant.address),
  contractBalanceBefore: await balance(contractAddress),
})

// Close any earlier attempt on this deployment conservatively before starting
// the canonical agreement. This is used only when a previous oversized evidence
// response caused a finalized rollback, so the tenant deposit is never stranded.
if (process.env.BIDFRAME_CLEANUP_AGREEMENT_ID) {
  const cleanupId = BigInt(process.env.BIDFRAME_CLEANUP_AGREEMENT_ID)
  const cleanupAgreement = await readAgreement(cleanupId)
  if (cleanupAgreement.status !== 'SETTLED') {
    const unresolvedItem = [1, 2, 3].map(BigInt)
    let targetItemId = null
    for (const itemId of unresolvedItem) {
      const item = await readItem(cleanupId, itemId)
      if (!item.assessed) {
        targetItemId = itemId
        break
      }
    }
    if (targetItemId === null) throw new Error('Cleanup agreement has no unresolved item to recover.')
    const targetItem = await readItem(cleanupId, targetItemId)
    if (!targetItem.evidence_challenged) {
      const challenge = await finalizedWrite('challenge failed-evidence diagnostic item', ownerClient, 'challenge_checkout_evidence', [cleanupId, targetItemId])
      record('diagnostic_cleanup_challenge_readback', { transaction: challenge.hash, agreementId: cleanupId, itemId: targetItemId, item: await readItem(cleanupId, targetItemId) })
    }
    const recovered = await finalizedWrite('resolve failed-evidence diagnostic item at zero', ownerClient, 'resolve_challenged_zero', [cleanupId, targetItemId])
    record('diagnostic_cleanup_recovery_readback', { transaction: recovered.hash, agreementId: cleanupId, itemId: targetItemId, item: await readItem(cleanupId, targetItemId), agreement: await readAgreement(cleanupId) })
    const cleanupReady = await finalizedWrite('mark diagnostic agreement READY', ownerClient, 'mark_ready', [cleanupId])
    const beforeCleanupSettlement = { tenant: await balance(cleanupAgreement.tenant), contract: await balance(contractAddress) }
    const cleanupSettlement = await finalizedWrite('settle diagnostic agreement with zero deduction', ownerClient, 'settle', [cleanupId])
    const afterCleanupSettlement = { tenant: await balance(cleanupAgreement.tenant), contract: await balance(contractAddress) }
    const cleanedAgreement = await readAgreement(cleanupId)
    record('diagnostic_agreement_zero_settlement', {
      agreementId: cleanupId,
      readyTransaction: cleanupReady.hash,
      settlementTransaction: cleanupSettlement.hash,
      agreement: cleanedAgreement,
      tenantBalanceBefore: beforeCleanupSettlement.tenant,
      tenantBalanceAfter: afterCleanupSettlement.tenant,
      tenantRefundDelta: afterCleanupSettlement.tenant - beforeCleanupSettlement.tenant,
      contractBalanceBefore: beforeCleanupSettlement.contract,
      contractBalanceAfter: afterCleanupSettlement.contract,
    })
    if (cleanedAgreement.status !== 'SETTLED' || BigInt(cleanedAgreement.settlement_deduction_wei) !== 0n || afterCleanupSettlement.tenant - beforeCleanupSettlement.tenant !== BigInt(cleanupAgreement.deposit_wei) || afterCleanupSettlement.contract !== 0n) {
      throw new Error('Diagnostic agreement failed its zero-deduction refund cleanup.')
    }
  } else {
    record('diagnostic_agreement_already_settled', { agreementId: cleanupId, agreement: cleanupAgreement })
  }
}

// Studio's documented account funding RPC is used only to provide fee reserve to
// this new tenant wallet. The agreement itself is funded in the next payable call.
const faucetResponse = await fetch(rpc, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', method: 'sim_fundAccount', params: [tenant.address, Number(tenantFaucetAmount)], id: 1 }),
})
const faucetJson = await faucetResponse.json()
if (!faucetResponse.ok || faucetJson.error) throw new Error(`Studio faucet failed: ${JSON.stringify(faucetJson)}`)
const fundedTenantBalance = await balance(tenant.address)
record('tenant_faucet_fee_reserve', { response: faucetJson, amountWei: tenantFaucetAmount, amountGEN: formatEther(tenantFaucetAmount), tenantBalanceAfter: fundedTenantBalance })
if (fundedTenantBalance < tenantFaucetAmount) throw new Error('Studio faucet response did not credit the tenant balance with 2 GEN.')

const cleanUrl = 'https://images.unsplash.com/photo-1533628635777-112b2239b1c7?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000'
const damagedUrl = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/Cracked_wall.jpg/1280px-Cracked_wall.jpg'

async function verifyEvidence(url, expected) {
  const response = await fetch(url)
  const bytes = Buffer.from(await response.arrayBuffer())
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Image fetch failed: ${url}`)
  if (sha256 !== expected) throw new Error(`Image hash changed for ${url}: ${sha256}`)
  record('evidence_verified', { url, status: response.status, contentType: response.headers.get('content-type'), bytes: bytes.length, sha256 })
  return sha256
}

const cleanSha = await verifyEvidence(cleanUrl, '657e62ce348118ab26e5e44527569b99e147bc58b5c26696d984c8d2c5aa82b4')
const damagedSha = await verifyEvidence(damagedUrl, '55a2befcc54a1ca59eb4249457ae7bba71cf30f746f938cbdae357af4280d93f')
const termsHash = createHash('sha256').update('Bidframe StudioNet canonical live lifecycle; 1 GEN exact deposit; frozen schedule; challenge zero-deduction recovery').digest('hex')

const created = await finalizedWrite('create canonical agreement', ownerClient, 'create_agreement', [
  'Bidframe StudioNet Canonical Lifecycle',
  'PUBLIC-EVIDENCE-REFERENCE-2026',
  tenant.address,
  deposit,
  termsHash,
])
const agreementId = await ownerClient.readContract({ address: contractAddress, functionName: 'get_latest_agreement_for_landlord', args: [owner.address] })
record('agreement_readback_after_create', { agreementCreateHash: created.hash, agreementId, agreement: await readAgreement(agreementId) })

const items = [
  { label: 'Reference surface unchanged', description: 'Same public plaster-wall photograph used as sealed move-in and move-out evidence.', baselineUrl: cleanUrl, baselineHash: cleanSha, checkoutUrl: cleanUrl, checkoutHash: cleanSha },
  { label: 'Reference wall with new visible crack', description: 'Public move-in plaster-wall reference compared to move-out image with a large visible wall crack.', baselineUrl: cleanUrl, baselineHash: cleanSha, checkoutUrl: damagedUrl, checkoutHash: damagedSha },
  { label: 'Challenged evidence recovery item', description: 'Public reference images used only to exercise counterparty challenge and zero-deduction recovery.', baselineUrl: cleanUrl, baselineHash: cleanSha, checkoutUrl: damagedUrl, checkoutHash: damagedSha },
]

for (let index = 0; index < items.length; index++) {
  const item = items[index]
  const added = await finalizedWrite(`register item ${index + 1}`, ownerClient, 'add_item', [
    BigInt(agreementId), item.label, item.description, item.baselineUrl, item.baselineHash,
    gen / 10n, gen / 4n, gen / 2n, 3n * gen / 4n,
  ])
  record('inventory_readback', { itemId: index + 1, transaction: added.hash, item: await readItem(agreementId, index + 1), agreement: await readAgreement(agreementId) })
}

record('agreement_readback_before_funding', { agreement: await readAgreement(agreementId) })
const contractBeforeFunding = await balance(contractAddress)
const funded = await finalizedWrite('tenant funds exact 1 GEN deposit', tenantClient, 'fund_agreement', [BigInt(agreementId)], deposit)
const fundingAgreement = await readAgreement(agreementId)
const contractAfterFunding = await balance(contractAddress)
const tenantAfterFunding = await balance(tenant.address)
record('funding_readback', {
  fundingHash: funded.hash,
  depositWei: deposit,
  depositGEN: formatEther(deposit),
  valueCredited: funded.summary.valueCredited,
  agreement: fundingAgreement,
  contractBalanceBefore: contractBeforeFunding,
  contractBalanceAfter: contractAfterFunding,
  contractBalanceDelta: contractAfterFunding - contractBeforeFunding,
  tenantBalanceAfter: tenantAfterFunding,
})
if (fundingAgreement.status !== 'ACTIVE') throw new Error('Exact deposit did not transition agreement into ACTIVE.')

await finalizedWrite('open checkout', ownerClient, 'open_checkout', [BigInt(agreementId)])
record('checkout_readback', { agreement: await readAgreement(agreementId) })

for (let index = 0; index < items.length; index++) {
  const item = items[index]
  const evidenceClient = index === 2 ? ownerClient : tenantClient
  const evidenceTx = await finalizedWrite(`submit move-out evidence item ${index + 1}`, evidenceClient, 'submit_checkout_evidence', [BigInt(agreementId), BigInt(index + 1), item.checkoutUrl, item.checkoutHash])
  record('checkout_evidence_readback', { itemId: index + 1, transaction: evidenceTx.hash, item: await readItem(agreementId, index + 1), agreement: await readAgreement(agreementId) })
}

const challenged = await finalizedWrite('tenant challenges item 3 evidence', tenantClient, 'challenge_checkout_evidence', [BigInt(agreementId), 3n])
record('challenge_readback', { challengeHash: challenged.hash, item: await readItem(agreementId, 3) })
const blockedAssessment = await finalizedWrite('assessment blocked while item 3 is challenged', ownerClient, 'assess_item', [BigInt(agreementId), 3n], 0n, true)
if (blockedAssessment.hash) record('blocked_assessment_evidence', { transaction: blockedAssessment.hash, status: blockedAssessment.summary.statusName, execution: blockedAssessment.summary.execution })
const recovery = await finalizedWrite('resolve challenged item 3 at zero deduction', ownerClient, 'resolve_challenged_zero', [BigInt(agreementId), 3n])
const recoveredItem = await readItem(agreementId, 3)
record('challenge_recovery_readback', { recoveryHash: recovery.hash, item: recoveredItem, agreement: await readAgreement(agreementId) })
if (recoveredItem.deduction_wei !== 0n && String(recoveredItem.deduction_wei) !== '0') throw new Error('Challenge recovery did not resolve at zero deduction.')

const unchangedAssessment = await finalizedWrite('consensus assess item 1', ownerClient, 'assess_item', [BigInt(agreementId), 1n])
const unchangedItem = await readItem(agreementId, 1)
record('assessment_readback_item_1', { transaction: unchangedAssessment.hash, item: unchangedItem, agreement: await readAgreement(agreementId) })
if (!['UNCHANGED', 'NORMAL_WEAR'].includes(unchangedItem.verdict) || BigInt(unchangedItem.severity) !== 0n || BigInt(unchangedItem.deduction_wei) !== 0n) {
  throw new Error(`Item 1 was not a zero-deduction non-chargeable verdict: ${unchangedItem.verdict}/${unchangedItem.severity}/${unchangedItem.deduction_wei}`)
}

let damageAssessment
try {
  damageAssessment = await finalizedWrite('consensus assess item 2', ownerClient, 'assess_item', [BigInt(agreementId), 2n])
} catch (error) {
  const failure = safeError(error)
  record('damage_assessment_failed_closed', { agreementId, evidenceTransaction: null, error: failure, item: await readItem(agreementId, 2) })
  await closeAgreementAfterUnsuccessfulDamageProof(agreementId, 2, failure)
  throw new Error(`Live NEW_DAMAGE proof was not reached; agreement was safely settled: ${failure}`)
}
let damageItem = await readItem(agreementId, 2)
record('assessment_readback_item_2', { transaction: damageAssessment.hash, item: damageItem, agreement: await readAgreement(agreementId) })
if (damageItem.verdict === 'INCONCLUSIVE') {
  const resolved = await finalizedWrite('resolve item 2 INCONCLUSIVE at zero deduction', ownerClient, 'resolve_inconclusive_zero', [BigInt(agreementId), 2n])
  damageItem = await readItem(agreementId, 2)
  record('inconclusive_recovery_readback', { transaction: resolved.hash, item: damageItem, agreement: await readAgreement(agreementId) })
}
if (damageItem.verdict !== 'NEW_DAMAGE' || ![1, 2, 3].includes(Number(damageItem.severity))) {
  const reason = `Required live NEW_DAMAGE proof was not produced: ${damageItem.verdict}/${damageItem.severity}`
  await closeAgreementAfterUnsuccessfulDamageProof(agreementId, 2, reason)
  throw new Error(`${reason}; agreement was safely settled.`)
}
const damageSchedule = { 1: gen / 10n, 2: gen / 4n, 3: gen / 2n }
const expectedDamageDeduction = damageSchedule[Number(damageItem.severity)]
if (BigInt(damageItem.deduction_wei) !== expectedDamageDeduction) throw new Error('NEW_DAMAGE deduction does not match the frozen schedule.')

const beforeReady = await readAgreement(agreementId)
record('pre_ready_readback', { agreement: beforeReady, items: await Promise.all([1, 2, 3].map(itemId => readItem(agreementId, itemId))) })
const ready = await finalizedWrite('mark agreement READY', ownerClient, 'mark_ready', [BigInt(agreementId)])
const readyAgreement = await readAgreement(agreementId)
record('ready_readback', { transaction: ready.hash, agreement: readyAgreement })
if (readyAgreement.status !== 'READY') throw new Error('READY transaction finalized but readback status did not become READY.')

const beforeSettlement = {
  landlord: await balance(owner.address),
  tenant: await balance(tenant.address),
  contract: await balance(contractAddress),
}
record('balances_before_settlement', beforeSettlement)
const settlement = await finalizedWrite('settle canonical agreement', ownerClient, 'settle', [BigInt(agreementId)])
const afterSettlement = {
  landlord: await balance(owner.address),
  tenant: await balance(tenant.address),
  contract: await balance(contractAddress),
}
const finalAgreement = await readAgreement(agreementId)
const finalItems = await Promise.all([1, 2, 3].map(itemId => readItem(agreementId, itemId)))
const deduction = BigInt(finalAgreement.settlement_deduction_wei)
const refund = BigInt(finalAgreement.projected_refund_wei)
let triggeredTransactions = []
try {
  triggeredTransactions = await ownerClient.getTriggeredTransactionIds({ hash: settlement.hash })
} catch (error) {
  record('trigger_lookup_unavailable', { settlementHash: settlement.hash, error: String(error) })
}
record('settled_readback_and_balances', {
  settlementHash: settlement.hash,
  agreement: finalAgreement,
  items: finalItems,
  deduction,
  refund,
  deposit,
  arithmeticValid: deduction + refund === deposit,
  beforeSettlement,
  afterSettlement,
  landlordBalanceDelta: afterSettlement.landlord - beforeSettlement.landlord,
  tenantBalanceDelta: afterSettlement.tenant - beforeSettlement.tenant,
  contractBalanceDelta: afterSettlement.contract - beforeSettlement.contract,
  triggeredTransactions,
  settlementReceipt: {
    statusName: settlement.summary.statusName,
    resultName: settlement.summary.resultName,
    execution: settlement.summary.execution,
    valueCredited: settlement.summary.valueCredited,
    messages: settlement.tx.messages,
  },
})
if (finalAgreement.status !== 'SETTLED' || deduction + refund !== deposit) throw new Error('Final settlement readback/arithmetic invariant failed.')
if (afterSettlement.tenant - beforeSettlement.tenant !== refund) throw new Error('Tenant GEN balance delta does not equal the declared refund; inspect settlement transfers/fees.')
if (afterSettlement.contract !== 0n) throw new Error('Contract retains a nonzero native GEN balance after settlement.')

const tenantBalanceBeforeRetry = await balance(tenant.address)
const contractBalanceBeforeRetry = await balance(contractAddress)
const retry = await finalizedWrite('second settlement must fail', ownerClient, 'settle', [BigInt(agreementId)], 0n, true)
const tenantBalanceAfterRetry = await balance(tenant.address)
const contractBalanceAfterRetry = await balance(contractAddress)
const retryReadback = await readAgreement(agreementId)
record('second_settlement_negative_readback', {
  transaction: retry.hash,
  statusName: retry.summary?.statusName,
  execution: retry.summary?.execution,
  agreement: retryReadback,
  tenantBalanceBefore: tenantBalanceBeforeRetry,
  tenantBalanceAfter: tenantBalanceAfterRetry,
  contractBalanceBefore: contractBalanceBeforeRetry,
  contractBalanceAfter: contractBalanceAfterRetry,
  noAdditionalPayout: tenantBalanceBeforeRetry === tenantBalanceAfterRetry && contractBalanceBeforeRetry === contractBalanceAfterRetry,
})
if (retryReadback.status !== 'SETTLED' || tenantBalanceBeforeRetry !== tenantBalanceAfterRetry || contractBalanceBeforeRetry !== contractBalanceAfterRetry) {
  throw new Error('Second-settlement attempt changed payout balances or final state.')
}

record('lifecycle_complete', {
  agreementId,
  depositWei: deposit,
  unchanged: { verdict: unchangedItem.verdict, severity: unchangedItem.severity, deductionWei: unchangedItem.deduction_wei },
  newDamage: { verdict: damageItem.verdict, severity: damageItem.severity, deductionWei: damageItem.deduction_wei, expectedScheduleWei: expectedDamageDeduction },
  challengedRecovery: { verdict: recoveredItem.verdict, zeroDeduction: recoveredItem.deduction_wei, resolved: recoveredItem.inconclusive_resolved },
  finalAgreement,
})
