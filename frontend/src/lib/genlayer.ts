import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

export const CHAIN_ID = 61999
export const CHAIN_HEX = '0xf22f'
export const STUDIO_RPC = 'https://studio.genlayer.com/api'
export const EXPLORER_BASE = import.meta.env.VITE_EXPLORER_BASE || 'https://explorer-studio.genlayer.com'
export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '0x3f5F81618cc86604f7094E525F46f37363CD99a7') as `0x${string}`

export const readClient = createClient({ chain: studionet })
export type WalletClient = ReturnType<typeof createClient>

type ProviderErrorInfo = { code?: number; message?: string }
type StudioTransaction = {
  statusName?: string
  status?: number
  result_name?: string
  from_address?: string
  to_address?: string
  value?: bigint | string | number | null
  created_at?: string
  consensus_data?: {
    leader_receipt?: Array<{
      mode?: string
      execution_result?: string
      result?: { status?: string } | string | unknown
      pending_transactions?: Array<{ on?: string; value?: bigint | string | number; address?: string; is_eth_send?: boolean }>
    }>
  }
}

export type TransactionOutcome = {
  state: 'pending' | 'success' | 'failed'
  message: string
  transaction?: StudioTransaction
}

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

function parseAccounts(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(String).filter(address => /^0x[a-fA-F0-9]{40}$/.test(address))
    : []
}

export function createInjectedWalletClient(provider: NonNullable<Window['ethereum']>, address: string): WalletClient {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('Wallet did not expose a valid account.')
  return createClient({
    chain: studionet,
    account: address as `0x${string}`,
    provider,
  })
}

export async function getAuthorizedWalletSnapshot() {
  const provider = getInjectedProvider()
  if (!provider) return { provider: null, address: '', chainId: '' }

  const accounts = parseAccounts(await requestProvider(provider, 'eth_accounts'))
  const chainId = normalizeChainId(await requestProvider(provider, 'eth_chainId'))
  return { provider, address: accounts[0] || '', chainId }
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
    const requestedAccounts = parseAccounts(await provider.request({ method: 'eth_requestAccounts' }))
    const address = requestedAccounts[0]
    if (!address) throw new Error('Wallet did not return a valid account.')

    await ensureStudioNet(provider)

    const currentAccounts = parseAccounts(await provider.request({ method: 'eth_accounts' }))
    const activeAddress = currentAccounts[0] || address
    if (!activeAddress) throw new Error('Wallet did not expose a valid account after switching to StudioNet.')

    const verifiedChain = normalizeChainId(await provider.request({ method: 'eth_chainId' }))
    if (verifiedChain !== CHAIN_HEX) {
      throw new Error(`Wallet network verification failed: expected ${CHAIN_HEX}, received ${verifiedChain || 'unknown'}.`)
    }

    return { address: activeAddress, client: createInjectedWalletClient(provider, activeAddress) }
  } catch (error) {
    throw new Error(walletErrorMessage(error))
  }
}

export async function readContract<T>(functionName: string, args: unknown[] = []): Promise<T> {
  if (!isContractConfigured()) throw new Error('The canonical Bidframe contract address is not configured yet.')
  return await readClient.readContract({ address: CONTRACT_ADDRESS, functionName, args: args as never[] }) as T
}

export async function submitContract(client: WalletClient, functionName: string, args: unknown[] = [], value = 0n) {
  if (!isContractConfigured()) throw new Error('The canonical Bidframe contract address is not configured yet.')
  const hash = await client.writeContract({ address: CONTRACT_ADDRESS, functionName, args: args as never[], value }) as `0x${string}` & { length: 66 }
  return { hash: String(hash) }
}

export async function inspectTransaction(hash: string): Promise<TransactionOutcome> {
  try {
    const tx = await readClient.getTransaction({ hash: hash as `0x${string}` & { length: 66 } }) as unknown as StudioTransaction
    const finalized = tx.statusName === 'FINALIZED' || tx.status === 7
    if (!finalized) {
      return { state: 'pending', message: `StudioNet status: ${tx.statusName ?? tx.status ?? 'pending'}.`, transaction: tx }
    }

    const leader = tx.consensus_data?.leader_receipt?.find(row => row.mode === 'leader') ?? tx.consensus_data?.leader_receipt?.[0]
    const resultStatus = leader?.result && typeof leader.result === 'object'
      ? (leader.result as { status?: string }).status
      : undefined
    const success = tx.result_name === 'MAJORITY_AGREE'
      && leader?.execution_result === 'SUCCESS'
      && (resultStatus === undefined || resultStatus === 'return')

    if (success) {
      return { state: 'success', message: 'FINALIZED / MAJORITY_AGREE / SUCCESS', transaction: tx }
    }

    const detail = `FINALIZED / ${tx.result_name ?? 'unknown consensus'} / ${leader?.execution_result ?? 'unknown execution'}${resultStatus ? ` / ${resultStatus}` : ''}`
    return { state: 'failed', message: detail, transaction: tx }
  } catch (error) {
    // A submitted hash can be temporarily unavailable while StudioNet indexes or
    // rate-limits reads. That is not a terminal transaction failure.
    return {
      state: 'pending',
      message: `StudioNet status is temporarily unavailable; continuing to reconcile. ${error instanceof Error ? error.message : ''}`.trim(),
    }
  }
}

export async function assertSuccessfulFinalizedTransaction(hash: string, _receipt?: unknown) {
  const outcome = await inspectTransaction(hash)
  if (outcome.state !== 'success') {
    throw new Error(outcome.state === 'pending'
      ? `Transaction is not finalized yet (${outcome.message}).`
      : `Transaction finalized without successful contract execution (${outcome.message}).`)
  }
  return outcome.transaction
}

export async function writeContract(client: WalletClient, functionName: string, args: unknown[] = [], value = 0n) {
  return submitContract(client, functionName, args, value)
}

export function explorerTx(hash: string) { return `${EXPLORER_BASE}/tx/${hash}` }
export function explorerAddress(address: string) { return `${EXPLORER_BASE}/address/${address}` }
