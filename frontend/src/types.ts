export type Verdict = 'UNCHANGED' | 'NORMAL_WEAR' | 'NEW_DAMAGE' | 'MISSING' | 'INCONCLUSIVE'

export interface SettlementItem {
  id: number
  name: string
  description: string
  status: 'Ready' | 'Assessed' | 'Awaiting evidence'
  verdict?: Verdict
  severity?: 0 | 1 | 2 | 3
  deductionWei?: bigint
  baselineHash: string
  checkoutHash?: string
}

export interface AgreementSummary {
  id: number
  title: string
  propertyRef: string
  status: 'DRAFT' | 'ACTIVE' | 'CHECKOUT' | 'ASSESSING' | 'READY' | 'SETTLED'
  depositWei: bigint
  landlord: string
  tenant: string
  assessed: number
  itemCount: number
  deductionWei: bigint
  unresolved: number
}
