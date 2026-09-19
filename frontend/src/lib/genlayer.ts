import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { ExecutionResult, TransactionStatus } from 'genlayer-js/types'

export const CHAIN_ID = 61999
export const EXPLORER_BASE = import.meta.env.VITE_EXPLORER_BASE || 'https://explorer-studio.genlayer.com'
export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '') as `0x${string}` | ''

export const readClient = createClient({ chain: studionet })
export type WalletClient = ReturnType<typeof createClient>

export function isContractConfigured(): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS)
}

export async function connectWallet() {
  if (!window.ethereum) throw new Error('No injected EIP-1193 wallet found. Install MetaMask or a compatible wallet.')
  const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[]
  const address = accounts?.[0]
  if (!address) throw new Error('Wallet did not return an account.')
  const chainHex = `0x${CHAIN_ID.toString(16)}`
  const currentChain = await window.ethereum.request({ method: 'eth_chainId' })
  if (String(currentChain).toLowerCase() !== chainHex) {
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainHex }] })
    } catch (switchError) {
      const code = (switchError as { code?: number }).code
      if (code !== 4902) throw new Error('Switch your wallet to GenLayer StudioNet (chain 61999) and try again.')
      await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: chainHex, chainName: 'GenLayer StudioNet', rpcUrls: ['https://studio.genlayer.com/api'], nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 }, blockExplorerUrls: [EXPLORER_BASE] }] })
    }
  }
  const client = createClient({ chain: studionet, account: address as `0x${string}`, provider: window.ethereum })
  await client.connect('studionet')
  return { address, client }
}

export async function readContract<T>(functionName: string, args: unknown[] = []): Promise<T> {
  if (!isContractConfigured()) throw new Error('The canonical Bidframe contract address is not configured yet.')
  return await readClient.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName, args: args as never[] }) as T
}

export async function writeContract(client: WalletClient, functionName: string, args: unknown[] = [], value = 0n) {
  if (!isContractConfigured()) throw new Error('The canonical Bidframe contract address is not configured yet.')
  const hash = await client.writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName, args: args as never[], value })
  const receipt = await readClient.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED, interval: 3000 })
  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
    const tx = await readClient.getTransaction({ hash })
    const detail = (tx as { data?: { error?: string }; txDataDecoded?: { error?: string } }).data?.error
      ?? (tx as { txDataDecoded?: { error?: string } }).txDataDecoded?.error
    throw new Error(`Transaction finalized without successful execution${detail ? `: ${detail}` : '.'}`)
  }
  return { hash: String(hash), receipt }
}

export async function submitContract(client: WalletClient, functionName: string, args: unknown[] = [], value = 0n) {
  if (!isContractConfigured()) throw new Error('The canonical Bidframe contract address is not configured yet.')
  const hash = await client.writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName, args: args as never[], value }) as `0x${string}` & { length: 66 }
  return { hash: String(hash), finalized: readClient.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED, interval: 3000 }) }
}

export function explorerTx(hash: string) { return `${EXPLORER_BASE}/tx/${hash}` }
export function explorerAddress(address: string) { return `${EXPLORER_BASE}/address/${address}` }

