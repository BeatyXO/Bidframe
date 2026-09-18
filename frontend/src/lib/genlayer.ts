import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

export const CHAIN_ID = 61999
export const RPC_URL = 'https://studio.genlayer.com/api'
export const EXPLORER_BASE = import.meta.env.VITE_EXPLORER_BASE || 'https://explorer-studio.genlayer.com'
export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '') as `0x${string}` | ''

export const readClient = createClient({ chain: studionet })

export function isContractConfigured(): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS)
}

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error('No injected EIP-1193 wallet found. Install MetaMask or a compatible wallet.')
  }

  const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[]
  const address = accounts?.[0]
  if (!address) throw new Error('Wallet did not return an account.')

  const client = createClient({
    chain: studionet,
    account: address as `0x${string}`,
    provider: window.ethereum,
  })
  await client.connect('studionet')
  return { address, client }
}

export async function writeContract(
  client: ReturnType<typeof createClient>,
  functionName: string,
  args: unknown[] = [],
  value?: bigint,
) {
  if (!isContractConfigured()) throw new Error('Set VITE_CONTRACT_ADDRESS after deploying Bidframe.')

  const call = {
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName,
    args,
    ...(value !== undefined ? { value } : {}),
  }
  const estimate = await client.estimateTransactionFeesForWrite(call)
  const hash = await client.writeContract({
    ...call,
    fees: {
      distribution: estimate.distribution,
      messageAllocations: estimate.messageAllocations,
      feeValue: estimate.feeValue,
    },
  })
  const receipt = await readClient.waitForFinalization({ hash })
  return { hash, receipt }
}

export function explorerTx(hash: string) {
  return `${EXPLORER_BASE}/tx/${hash}`
}

export function explorerAddress(address: string) {
  return `${EXPLORER_BASE}/address/${address}`
}
