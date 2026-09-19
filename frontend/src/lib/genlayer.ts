import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'

export const CHAIN_ID = 61999
export const CHAIN_HEX = '0xf22f'
export const STUDIO_RPC = 'https://studio.genlayer.com/api'
export const EXPLORER_BASE = import.meta.env.VITE_EXPLORER_BASE || 'https://explorer-studio.genlayer.com'
export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '0x3f5F81618cc86604f7094E525F46f37363CD99a7') as `0x${string}`

export const readClient = createClient({ chain: studionet })
export type WalletClient = ReturnType<typeof createClient>

type ProviderErrorInfo = { code?: number; message?: string }

export function isContractConfigured(): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS)
}

export function getInjectedProvider() {
  return window.ethereum
}

function parseProviderCode(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value)
  return undefined
}

function extractProviderError(error: unknown): ProviderErrorInfo {
  const queue: unknown[] = [error]
  const seen = new Set<unknown>()
  let message: string | undefined

  while (queue.length) {
    const current = queue.shift()
    if (current == null || seen.has(current)) continue
    seen.add(current)

    if (typeof current === 'string') {
      message ||= current
      continue
    }
    if (current instanceof Error) {
      message ||= current.message
      const errorWithCause = current as Error & { code?: unknown; cause?: unknown }
      const code = parseProviderCode(errorWithCause.code)
      if (code !== undefined) return { code, message }
      if (errorWithCause.cause !== undefined) queue.push(errorWithCause.cause)
      continue
    }
    if (typeof current !== 'object') continue

    const record = current as Record<string, unknown>
    if (typeof record.message === 'string' && record.message.trim()) message ||= record.message
    const code = parseProviderCode(record.code)
    if (code !== undefined) return { code, message }

    for (const key of ['error', 'cause', 'data', 'originalError']) {
      if (record[key] !== undefined) queue.push(record[key])
    }
  }

  return { message }
}

export function walletErrorMessage(error: unknown, fallback = 'Wallet connection failed.'): string {
  const info = extractProviderError(error)
  if (info.code === 4001) return 'Wallet request was rejected. Approve the account/network request in your wallet to continue.'
  if (info.code === -32002) return 'A wallet request is already pending. Open your wallet and complete or reject it, then try again.'
  if (info.code === 4902) return 'GenLayer StudioNet is not configured in this wallet yet.'
  if (info.message) return info.message
  return fallback
}

async function requestProvider(provider: NonNullable<Window['ethereum']>, method: string, params?: unknown[] | object) {
  try {
    return await provider.request(params === undefined ? { method } : { method, params })
  } catch (error) {
    throw new Error(walletErrorMessage(error, `Wallet request failed while calling ${method}.`))
  }
}

function normalizeChainId(value: unknown): string {
  return String(value ?? '').toLowerCase()
}

export async function ensureStudioNet(provider: NonNullable<Window['ethereum']>) {
  let currentChain = normalizeChainId(await requestProvider(provider, 'eth_chainId'))
  if (currentChain === CHAIN_HEX) return

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_HEX }],
    })
  } catch (switchError) {
    const info = extractProviderError(switchError)
    if (info.code !== 4902) {
      throw new Error(walletErrorMessage(switchError, 'Could not switch the wallet to GenLayer StudioNet.'))
    }

    try {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: CHAIN_HEX,
          chainName: 'GenLayer StudioNet',
          rpcUrls: [STUDIO_RPC],
          nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
          blockExplorerUrls: [EXPLORER_BASE],
        }],
      })
    } catch (addError) {
      throw new Error(walletErrorMessage(addError, 'Could not add GenLayer StudioNet to the wallet.'))
    }

    // Adding a chain does not guarantee every injected wallet leaves it selected.
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_HEX }],
      })
    } catch (secondSwitchError) {
      throw new Error(walletErrorMessage(secondSwitchError, 'GenLayer StudioNet was added, but the wallet did not switch to it.'))
    }
  }

  currentChain = normalizeChainId(await requestProvider(provider, 'eth_chainId'))
  if (currentChain !== CHAIN_HEX) {
    throw new Error(`Wallet is still on chain ${currentChain || 'unknown'}. Switch to GenLayer StudioNet (61999 / ${CHAIN_HEX}) and try again.`)
  }
}

export async function connectWallet() {
  const provider = getInjectedProvider()
  if (!provider) throw new Error('No injected EIP-1193 wallet found. Install MetaMask or a compatible wallet.')

  try {
    const requestedAccounts = await provider.request({ method: 'eth_requestAccounts' })
    const accounts = Array.isArray(requestedAccounts) ? requestedAccounts.map(String) : []
    const address = accounts[0]
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Wallet did not return a valid account.')
    }

    await ensureStudioNet(provider)

    // Re-read accounts after the network prompts in case the wallet account changed.
    const currentAccounts = await provider.request({ method: 'eth_accounts' })
    const activeAccounts = Array.isArray(currentAccounts) ? currentAccounts.map(String) : []
    const activeAddress = activeAccounts[0] || address
    if (!/^0x[a-fA-F0-9]{40}$/.test(activeAddress)) {
      throw new Error('Wallet did not expose a valid account after switching to StudioNet.')
    }

    const verifiedChain = normalizeChainId(await provider.request({ method: 'eth_chainId' }))
    if (verifiedChain !== CHAIN_HEX) {
      throw new Error(`Wallet network verification failed: expected ${CHAIN_HEX}, received ${verifiedChain || 'unknown'}.`)
    }

    // Do not call client.connect('studionet') here. genlayer-js 1.1.8's connect()
    // also invokes MetaMask Snap APIs. Bidframe intentionally uses injected
    // EIP-1193 wallets only, so network management is completed above.
    const client = createClient({
      chain: studionet,
      account: activeAddress as `0x${string}`,
      provider,
    })

    return { address: activeAddress, client }
  } catch (error) {
    throw new Error(walletErrorMessage(error))
  }
}

export async function readContract<T>(functionName: string, args: unknown[] = []): Promise<T> {
  if (!isContractConfigured()) throw new Error('The canonical Bidframe contract address is not configured yet.')
  return await readClient.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName, args: args as never[] }) as T
}

export async function writeContract(client: WalletClient, functionName: string, args: unknown[] = [], value = 0n) {
  if (!isContractConfigured()) throw new Error('The canonical Bidframe contract address is not configured yet.')
  const hash = await client.writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName, args: args as never[], value })
  const receipt = await readClient.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED, interval: 3000 })
  await assertSuccessfulFinalizedTransaction(String(hash), receipt)
  return { hash: String(hash), receipt }
}

// The StudioNet JSON-RPC response exposes finality and execution under statusName,
// result_name, and consensus_data.leader_receipt. genlayer-js 1.1.x does not
// populate txExecutionResultName for this response shape.
export async function assertSuccessfulFinalizedTransaction(hash: string, receipt: unknown) {
  const tx = await readClient.getTransaction({ hash: hash as `0x${string}` & { length: 66 } }) as unknown as {
    statusName?: string
    status?: number
    result_name?: string
    consensus_data?: { leader_receipt?: Array<{ mode?: string; execution_result?: string; result?: { status?: string } }> }
  }
  const receiptStatus = receipt as { statusName?: string; status?: number }
  const finalized = tx.statusName === 'FINALIZED' || receiptStatus.statusName === 'FINALIZED' || tx.status === 7 || receiptStatus.status === 7
  const leader = tx.consensus_data?.leader_receipt?.find(row => row.mode === 'leader') ?? tx.consensus_data?.leader_receipt?.[0]
  const succeeded = finalized
    && tx.result_name === 'MAJORITY_AGREE'
    && leader?.execution_result === 'SUCCESS'
    && leader.result?.status === 'return'
  if (!succeeded) {
    const detail = `status=${tx.statusName ?? receiptStatus.statusName ?? tx.status ?? receiptStatus.status ?? 'unknown'}, consensus=${tx.result_name ?? 'unknown'}, execution=${leader?.execution_result ?? 'unknown'}, return=${leader?.result?.status ?? 'unknown'}`
    throw new Error(`Transaction did not finalize with successful contract execution (${detail}).`)
  }
  return tx
}

export async function submitContract(client: WalletClient, functionName: string, args: unknown[] = [], value = 0n) {
  if (!isContractConfigured()) throw new Error('The canonical Bidframe contract address is not configured yet.')
  const hash = await client.writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName, args: args as never[], value }) as `0x${string}` & { length: 66 }
  return { hash: String(hash), finalized: readClient.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED, interval: 3000 }) }
}

export function explorerTx(hash: string) { return `${EXPLORER_BASE}/tx/${hash}` }
export function explorerAddress(address: string) { return `${EXPLORER_BASE}/address/${address}` }
