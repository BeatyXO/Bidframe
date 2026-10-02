import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createAccount, createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'
import { createPublicClient, formatEther, http } from 'viem'
import { generatePrivateKey } from 'viem/accounts'

const rpc = 'https://studio.genlayer.com/api'
const contractAddress = process.env.BIDFRAME_CONTRACT_ADDRESS
const fixtureCommit = process.env.BIDFRAME_FIXTURE_COMMIT
const deployedCommit = process.env.BIDFRAME_DEPLOYED_COMMIT
const contractSha256 = process.env.BIDFRAME_CONTRACT_SHA256
const evidenceLog = resolve(process.env.BIDFRAME_EVIDENCE_PATH || '../artifacts/studionet-cure-milestone.json')
const gen = 10n ** 18n
const deposit = gen
const cureWindowSeconds = 900

const generateFreshParties = process.env.BIDFRAME_GENERATE_FRESH_PARTIES === 'true'
if ((!generateFreshParties && (!process.env.BIDFRAME_LANDLORD_PRIVATE_KEY || !process.env.BIDFRAME_TENANT_PRIVATE_KEY)) || !contractAddress || !fixtureCommit) {
  throw new Error('Contract, fixture commit and party signing keys (or explicit fresh-party mode) are required.')
}

const landlord = createAccount(process.env.BIDFRAME_LANDLORD_PRIVATE_KEY || generatePrivateKey())
const tenant = createAccount(process.env.BIDFRAME_TENANT_PRIVATE_KEY || generatePrivateKey())
if (process.env.BIDFRAME_EXPECT_LANDLORD && landlord.address.toLowerCase() !== process.env.BIDFRAME_EXPECT_LANDLORD.toLowerCase()) {
  throw new Error('Landlord key/address mismatch.')
}
if (process.env.BIDFRAME_EXPECT_TENANT && tenant.address.toLowerCase() !== process.env.BIDFRAME_EXPECT_TENANT.toLowerCase()) {
  throw new Error('Tenant key/address mismatch.')
}
const publicClient = createPublicClient({ chain: studionet, transport: http(rpc) })
const landlordClient = createClient({ chain: studionet, account: landlord })
const tenantClient = createClient({ chain: studionet, account: tenant })
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

function record(type, data) {
  const entry = { time: new Date().toISOString(), type, ...normalize(data) }
  records.push(entry)
  mkdirSync(dirname(evidenceLog), { recursive: true })
  writeFileSync(evidenceLog, `${JSON.stringify(records, null, 2)}\n`)
  console.log(JSON.stringify(entry))
}

function summarize(tx, receipt) {
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
  }
}

async function write(label, client, functionName, args = [], value = 0n) {
  const hash = await client.writeContract({ address: contractAddress, functionName, args, value })
  record('submitted', { label, functionName, hash: String(hash), valueWei: value })
  const receipt = await landlordClient.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    interval: 3000,
    retries: 600,
  })
  const tx = await landlordClient.getTransaction({ hash })
  const summary = summarize(tx, receipt)
  record('finalized', { label, functionName, hash: String(hash), ...summary })
  if (!summary.finalized || !summary.successful) {
    throw new Error(`${label}: unsuccessful finalization (${summary.statusName}/${summary.resultName}/${summary.execution}/${summary.returnStatus}).`)
  }
  return { hash: String(hash), tx, receipt, summary }
}

async function expectGuardFailure(label, client, functionName, args = []) {
  let hash
  try {
    hash = await client.writeContract({ address: contractAddress, functionName, args, value: 0n })
  } catch (error) {
    record('negative_guard_rejected_before_submission', { label, functionName, error: safeError(error) })
    return { rejectedBeforeSubmission: true }
  }
  record('negative_guard_submitted', { label, functionName, hash: String(hash) })
  const receipt = await landlordClient.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    interval: 3000,
    retries: 600,
  })
  const tx = await landlordClient.getTransaction({ hash })
  const summary = summarize(tx, receipt)
  record('negative_guard_finalized', { label, functionName, hash: String(hash), ...summary })
  if (!summary.finalized || summary.successful) throw new Error(`${label}: expected a finalized contract guard failure.`)
  return { hash: String(hash), tx, receipt, summary }
}

async function readAgreement(id) {
  return landlordClient.readContract({ address: contractAddress, functionName: 'get_agreement', args: [BigInt(id)] })
}

async function readItem(id, itemId) {
  return landlordClient.readContract({ address: contractAddress, functionName: 'get_item', args: [BigInt(id), BigInt(itemId)] })
}

async function balance(address) {
  return publicClient.getBalance({ address })
}

async function verifyImage(url, expectedHash) {
  const response = await fetch(url, { redirect: 'follow' })
  const bytes = Buffer.from(await response.arrayBuffer())
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (!response.ok || !response.headers.get('content-type')?.toLowerCase().startsWith('image/png')) {
    throw new Error(`Pinned evidence URL failed as PNG: ${url}`)
  }
  if (sha256 !== expectedHash) throw new Error(`Pinned fixture hash mismatch: ${url}`)
  record('fixture_verified', { url, status: response.status, contentType: response.headers.get('content-type'), bytes: bytes.length, sha256 })
  return sha256
}

async function pause(milliseconds) {
  return new Promise(resolvePause => setTimeout(resolvePause, milliseconds))
}

async function closeSafely(id) {
  let agreement = await readAgreement(id)
  record('recovery_state_before_cleanup', { agreement })
  if (agreement.status === 'DRAFT' || agreement.status === 'SETTLED') return

  if (agreement.status === 'ACTIVE') {
    await write('recovery opens checkout', landlordClient, 'open_checkout', [BigInt(id)])
    agreement = await readAgreement(id)
  }

  for (let itemId = 1; itemId <= Number(agreement.item_count); itemId++) {
    let item = await readItem(id, itemId)
    if (!item.checkout_url) {
      await write(`recovery submits checkout evidence for item ${itemId}`, tenantClient, 'submit_checkout_evidence', [BigInt(id), BigInt(itemId), urls.damaged, hashes.damaged])
      item = await readItem(id, itemId)
    }
    if (!item.assessed) {
      if (!item.evidence_challenged) {
        const challenger = String(item.checkout_submitter).toLowerCase() === tenant.address.toLowerCase() ? landlordClient : tenantClient
        await write(`recovery challenges unresolved evidence for item ${itemId}`, challenger, 'challenge_checkout_evidence', [BigInt(id), BigInt(itemId)])
      }
      await write(`recovery resolves item ${itemId} at zero deduction`, landlordClient, 'resolve_challenged_zero', [BigInt(id), BigInt(itemId)])
      item = await readItem(id, itemId)
    } else if (item.verdict === 'INCONCLUSIVE' && !item.inconclusive_resolved) {
      await write(`recovery resolves inconclusive item ${itemId} at zero`, landlordClient, 'resolve_inconclusive_zero', [BigInt(id), BigInt(itemId)])
      item = await readItem(id, itemId)
    }

    if (item.cure_status === 'ELIGIBLE' && Math.floor(Date.now() / 1000) < Number(item.cure_deadline)) {
      await write(`recovery waives unused cure for item ${itemId}`, tenantClient, 'waive_cure', [BigInt(id), BigInt(itemId)])
      item = await readItem(id, itemId)
    }
    if (item.cure_status === 'SUBMITTED' || item.cure_status === 'ELIGIBLE') {
      while (Math.floor(Date.now() / 1000) < Number(item.cure_deadline)) {
        const remaining = Number(item.cure_deadline) - Math.floor(Date.now() / 1000)
        record('recovery_waiting_for_cure_expiry', { itemId, remainingSeconds: remaining })
        await pause(Math.min(60_000, remaining * 1000 + 1500))
        item = await readItem(id, itemId)
        if (item.cure_status !== 'SUBMITTED' && item.cure_status !== 'ELIGIBLE') break
      }
      if (item.cure_status === 'SUBMITTED' || item.cure_status === 'ELIGIBLE') {
        await write(`recovery expires cure for item ${itemId}`, landlordClient, 'expire_cure', [BigInt(id), BigInt(itemId)])
      }
    }
  }

  agreement = await readAgreement(id)
  record('recovery_state_before_finality', { agreement, items: await Promise.all(Array.from({ length: Number(agreement.item_count) }, (_, index) => readItem(id, index + 1))) })
  if (agreement.assessed_count === agreement.item_count && !agreement.has_inconclusive && agreement.open_cure_count === 0) {
    if (agreement.status === 'ASSESSING') await write('recovery marks agreement READY', landlordClient, 'mark_ready', [BigInt(id)])
    agreement = await readAgreement(id)
    if (agreement.status === 'READY') await write('recovery settles agreement', landlordClient, 'settle', [BigInt(id)])
  }
  record('recovery_final_readback', { agreement: await readAgreement(id), contractBalance: await balance(contractAddress) })
}

const fixture = name => `https://raw.githubusercontent.com/BeatyXO/Bidframe/${fixtureCommit}/docs/fixtures/cure-live/${name}`
const urls = {
  baseline: fixture('move-in-baseline.png'),
  damaged: fixture('move-out-damaged.png'),
  restoredA: fixture('cure-item-a-restored.png'),
  notRestoredB: fixture('cure-item-b-not-restored.png'),
}
const hashes = {
  baseline: 'df1c354785e35e44e54c2bd4a694c1041e94c617ea4ba402cc7509a98cf11ef1',
  damaged: 'f93f029592989cf8deb7f40d1c66d01b59388f9cb1e4dd7543a9bd8889fe96a1',
  restoredA: '59ab7195f04db54e071afbef14dbda47024d64d2afa848b742c8680eb9a2ff98',
  notRestoredB: 'f93f029592989cf8deb7f40d1c66d01b59388f9cb1e4dd7543a9bd8889fe96a1',
}

const chainId = await publicClient.getChainId()
if (chainId !== 61999) throw new Error(`Wrong chain ID: ${chainId}`)
for (const [name, url] of Object.entries(urls)) await verifyImage(url, hashes[name])
record('network_and_parties', {
  chainId,
  rpc,
  contractAddress,
  fixtureCommit,
  deployedCommit,
  contractSha256,
  freshPartiesGeneratedInMemory: generateFreshParties,
  landlord: landlord.address,
  tenant: tenant.address,
  landlordBalanceBefore: await balance(landlord.address),
  tenantBalanceBefore: await balance(tenant.address),
  contractBalanceBefore: await balance(contractAddress),
})

const faucetAmount = 2n * gen
for (const [role, address] of [['landlord', landlord.address], ['tenant', tenant.address]]) {
  const faucetResponse = await fetch(rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'sim_fundAccount', params: [address, Number(faucetAmount)], id: 1 }),
  })
  const faucetResult = await faucetResponse.json()
  if (!faucetResponse.ok || faucetResult.error) throw new Error(`Studio ${role} fee-funding faucet failed: ${JSON.stringify(faucetResult)}`)
  const fundedBalance = await balance(address)
  record(`${role}_fee_reserve`, { amountWei: faucetAmount, amountGEN: formatEther(faucetAmount), response: faucetResult, balanceAfter: fundedBalance })
  if (fundedBalance < faucetAmount) throw new Error(`Studio faucet did not credit the ${role} fee reserve.`)
}

let agreementId = null

async function executeLifecycle() {
const termsHash = createHash('sha256').update(`Bidframe remediation live proof ${fixtureCommit}; synthetic fixtures; exact ${deposit} wei deposit`).digest('hex')
const create = await write('create remediation lifecycle agreement', landlordClient, 'create_agreement', [
  'Bidframe Remediation Live Verification',
  `SYNTHETIC-CURE-${fixtureCommit.slice(0, 12)}`,
  tenant.address,
  deposit,
  termsHash,
])
agreementId = await landlordClient.readContract({ address: contractAddress, functionName: 'get_latest_agreement_for_landlord', args: [landlord.address] })
record('agreement_created_readback', { transaction: create.hash, agreementId, agreement: await readAgreement(agreementId) })

const policy = await write('configure DRAFT cure policy', landlordClient, 'configure_cure_policy', [BigInt(agreementId), BigInt(cureWindowSeconds)])
record('policy_readback', { transaction: policy.hash, agreement: await readAgreement(agreementId) })

const itemDescriptions = [
  { label: 'Synthetic left wall bay crack', description: 'Synthetic protocol fixture only, not real tenancy evidence. Assess the distinct LEFT wall bay: move-out shows a new prominent jagged crack that was absent in the move-in baseline. Ignore the right bay.' },
  { label: 'Synthetic right wall bay crack', description: 'Synthetic protocol fixture only, not real tenancy evidence. Assess the distinct RIGHT wall bay: move-out shows a new prominent jagged crack that was absent in the move-in baseline. Ignore the left bay.' },
]
for (let index = 0; index < itemDescriptions.length; index++) {
  const item = itemDescriptions[index]
  const tx = await write(`register synthetic damage item ${index + 1}`, landlordClient, 'add_item', [
    BigInt(agreementId), item.label, item.description,
    urls.baseline, hashes.baseline,
    gen / 20n, gen / 8n, gen / 4n, gen / 4n,
  ])
  record('item_registered_readback', { itemId: index + 1, transaction: tx.hash, item: await readItem(agreementId, index + 1) })
}

record('pre_funding_readback', { agreement: await readAgreement(agreementId), items: await Promise.all([1, 2].map(id => readItem(agreementId, id))) })
const contractBeforeFunding = await balance(contractAddress)
const funding = await write('tenant funds exact 1 GEN deposit', tenantClient, 'fund_agreement', [BigInt(agreementId)], deposit)
const fundedAgreement = await readAgreement(agreementId)
const contractAfterFunding = await balance(contractAddress)
record('funding_readback', {
  transaction: funding.hash,
  agreement: fundedAgreement,
  depositWei: deposit,
  valueCredited: funding.summary.valueCredited,
  contractBalanceBefore: contractBeforeFunding,
  contractBalanceAfter: contractAfterFunding,
  contractBalanceDelta: contractAfterFunding - contractBeforeFunding,
})
if (fundedAgreement.status !== 'ACTIVE' || contractAfterFunding - contractBeforeFunding !== deposit) {
  throw new Error('Exact deposit funding failed its status or balance-delta check.')
}

await write('open checkout', landlordClient, 'open_checkout', [BigInt(agreementId)])
for (let itemId = 1; itemId <= 2; itemId++) {
  const tx = await write(`tenant submits damaged checkout evidence for item ${itemId}`, tenantClient, 'submit_checkout_evidence', [BigInt(agreementId), BigInt(itemId), urls.damaged, hashes.damaged])
  record('checkout_evidence_readback', { itemId, transaction: tx.hash, item: await readItem(agreementId, itemId) })
}

for (let itemId = 1; itemId <= 2; itemId++) {
  const tx = await write(`GenLayer assesses original damage item ${itemId}`, landlordClient, 'assess_item', [BigInt(agreementId), BigInt(itemId)])
  const item = await readItem(agreementId, itemId)
  record('original_assessment_readback', { itemId, transaction: tx.hash, item, agreement: await readAgreement(agreementId) })
  if (!item.assessed) throw new Error(`Item ${itemId} assessment did not persist.`)
}

const assessedItems = await Promise.all([1, 2].map(id => readItem(agreementId, id)))
const eligibleDamageItems = assessedItems.filter(item => item.verdict === 'NEW_DAMAGE' && item.cure_status === 'ELIGIBLE' && BigInt(item.original_deduction_wei) > 0n)
if (eligibleDamageItems.length !== 2) {
  record('live_new_damage_gate_not_met', { assessedItems, eligibleDamageCount: eligibleDamageItems.length })
  throw new Error('The two synthetic bays did not both reach NEW_DAMAGE with positive cure-eligible deductions.')
}

const cureEvidence = [
  { url: urls.restoredA, hash: hashes.restoredA },
  { url: urls.notRestoredB, hash: hashes.notRestoredB },
]
for (let index = 0; index < cureEvidence.length; index++) {
  const itemId = index + 1
  const evidence = cureEvidence[index]
  const tx = await write(`tenant submits immutable cure evidence for item ${itemId}`, tenantClient, 'submit_cure_evidence', [BigInt(agreementId), BigInt(itemId), evidence.url, evidence.hash])
  record('cure_submission_readback', { itemId, transaction: tx.hash, item: await readItem(agreementId, itemId) })
}

const blockedReady = await expectGuardFailure('READY is blocked while cure evidence is unresolved', landlordClient, 'mark_ready', [BigInt(agreementId)])
record('ready_guard_readback', { result: blockedReady, agreement: await readAgreement(agreementId) })

for (let itemId = 1; itemId <= 2; itemId++) {
  const tx = await write(`GenLayer assesses cure evidence for item ${itemId}`, landlordClient, 'assess_cure', [BigInt(agreementId), BigInt(itemId)])
  const item = await readItem(agreementId, itemId)
  record('cure_assessment_readback', { itemId, transaction: tx.hash, item, agreement: await readAgreement(agreementId) })
  if (!['RESTORED', 'NOT_RESTORED', 'INCONCLUSIVE'].includes(item.cure_verdict)) {
    throw new Error(`Item ${itemId} cure verdict did not persist.`)
  }
}

const itemsBeforeReady = await Promise.all([1, 2].map(id => readItem(agreementId, id)))
const agreementBeforeReady = await readAgreement(agreementId)
record('pre_ready_readback', { agreement: agreementBeforeReady, items: itemsBeforeReady })
if (agreementBeforeReady.open_cure_count !== 0) throw new Error('Cure opportunities remain active after cure assessments.')

const ready = await write('mark agreement READY', landlordClient, 'mark_ready', [BigInt(agreementId)])
const readyAgreement = await readAgreement(agreementId)
record('ready_readback', { transaction: ready.hash, agreement: readyAgreement })
if (readyAgreement.status !== 'READY') throw new Error('Agreement did not enter READY.')

const balancesBeforeSettlement = {
  landlord: await balance(landlord.address),
  tenant: await balance(tenant.address),
  contract: await balance(contractAddress),
}
record('balances_before_settlement', balancesBeforeSettlement)
const settlement = await write('settle mixed restored and not-restored agreement', landlordClient, 'settle', [BigInt(agreementId)])
const balancesAfterSettlement = {
  landlord: await balance(landlord.address),
  tenant: await balance(tenant.address),
  contract: await balance(contractAddress),
}
const finalAgreement = await readAgreement(agreementId)
const finalItems = await Promise.all([1, 2].map(id => readItem(agreementId, id)))
const deduction = BigInt(finalAgreement.settlement_deduction_wei)
const refund = BigInt(finalAgreement.projected_refund_wei)
let triggeredTransactions = []
try {
  triggeredTransactions = await landlordClient.getTriggeredTransactionIds({ hash: settlement.hash })
} catch (error) {
  record('trigger_lookup_unavailable', { settlementHash: settlement.hash, error: safeError(error) })
}
record('settled_readback_and_balances', {
  transaction: settlement.hash,
  agreement: finalAgreement,
  items: finalItems,
  deduction,
  refund,
  deposit,
  arithmeticValid: deduction + refund === deposit,
  balancesBeforeSettlement,
  balancesAfterSettlement,
  landlordBalanceDelta: balancesAfterSettlement.landlord - balancesBeforeSettlement.landlord,
  tenantBalanceDelta: balancesAfterSettlement.tenant - balancesBeforeSettlement.tenant,
  contractBalanceDelta: balancesAfterSettlement.contract - balancesBeforeSettlement.contract,
  triggeredTransactions,
  settlementReceipt: {
    statusName: settlement.summary.statusName,
    resultName: settlement.summary.resultName,
    execution: settlement.summary.execution,
    valueCredited: settlement.summary.valueCredited,
    messages: settlement.tx.messages,
  },
})
if (finalAgreement.status !== 'SETTLED' || deduction + refund !== deposit) throw new Error('Final settlement state or arithmetic invariant failed.')
if (balancesAfterSettlement.tenant - balancesBeforeSettlement.tenant !== refund) throw new Error('Tenant balance delta differs from the declared refund.')
if (balancesAfterSettlement.contract !== 0n) throw new Error('Fresh milestone contract retains funds after settlement.')

record('live_cure_lifecycle_complete', {
  agreementId,
  depositWei: deposit,
  fixtureCommit,
  originalVerdicts: assessedItems.map(item => ({ itemId: item.id, verdict: item.verdict, severity: item.severity, originalDeductionWei: item.original_deduction_wei })),
  cureVerdicts: finalItems.map(item => ({ itemId: item.id, verdict: item.cure_verdict, effectiveDeductionWei: item.effective_deduction_wei })),
  finalAgreement,
})
}

try {
  await executeLifecycle()
} catch (error) {
  record('lifecycle_failed', { agreementId, error: safeError(error) })
  if (agreementId !== null) {
    try {
      await closeSafely(agreementId)
    } catch (recoveryError) {
      record('recovery_failed', { agreementId, error: safeError(recoveryError), agreement: await readAgreement(agreementId).catch(() => null) })
    }
  }
  throw error
}
