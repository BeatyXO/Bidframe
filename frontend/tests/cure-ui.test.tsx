// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CaseView, ItemCard } from '../src/App'
import { classifyStudioTransaction } from '../src/lib/genlayer'

const GEN = 10n ** 18n
const landlord = '0x1111111111111111111111111111111111111111'
const tenant = '0x2222222222222222222222222222222222222222'
const stranger = '0x3333333333333333333333333333333333333333'
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

function mount(element: React.ReactNode) {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => root.render(element))
  return container
}

function fillInput(input: HTMLInputElement, value: string) {
  fireEvent.change(input, { target: { value } })
}

function baseAgreement(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, title: 'Test lease', property_ref: 'UNIT-1', terms_hash: 'a'.repeat(64), status: 'ASSESSING', landlord, tenant,
    deposit_wei: 2n * GEN, item_count: 1, assessed_count: 1, raw_deduction_wei: GEN / 2n,
    settlement_deduction_wei: GEN / 2n, projected_refund_wei: GEN + GEN / 2n,
    has_inconclusive: false, inconclusive_count: 0, cure_window_seconds: 86400, open_cure_count: 1,
    ...overrides,
  }
}

function baseItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, label: 'North wall', description: 'Painted wall', baseline_url: 'https://evidence.test/before.jpg', baseline_sha256: 'a'.repeat(64),
    checkout_url: 'https://evidence.test/checkout.jpg', checkout_sha256: 'b'.repeat(64), checkout_submitter: tenant, evidence_challenged: false,
    replacement_url: '', replacement_proposer: '', assessed: true, verdict: 'NEW_DAMAGE', severity: 2, deduction_wei: GEN / 2n,
    original_deduction_wei: GEN / 2n, effective_deduction_wei: GEN / 2n, reasoning: 'A new crack is visible.', inconclusive_resolved: false,
    assessed_at: 1000, cure_status: 'ELIGIBLE', cure_deadline: Math.floor(Date.now() / 1000) + 3600, cure_url: '', cure_sha256: '', cure_submitter: '',
    cure_submitted_at: 0, cure_verdict: '', cure_reasoning: '', minor_wei: GEN / 10n, moderate_wei: GEN / 4n,
    severe_wei: GEN / 2n, missing_wei: GEN,
    ...overrides,
  }
}

function itemView(item: ReturnType<typeof baseItem>, wallet = tenant, connected = true) {
  const transact = vi.fn()
  const view = mount(<ItemCard
    item={item as never} agreement={baseAgreement() as never} wallet={wallet} connected={connected}
    evidence={{ url: '', hash: '' }} replacement={{ url: '', hash: '' }} cureEvidence={{ url: '', hash: '' }}
    setEvidence={vi.fn()} setReplacement={vi.fn()} setCureEvidence={vi.fn()} setEvidenceHash={vi.fn()}
    setReplacementHash={vi.fn()} setCureHash={vi.fn()} transact={transact}
  />)
  return { view, transact }
}

function caseView(item: ReturnType<typeof baseItem>, wallet = tenant) {
  const transact = vi.fn(async () => ({ hash: '0xabc' }))
  const view = mount(<CaseView
    agreement={baseAgreement() as never} items={[item as never]} id="1" setId={vi.fn()} loading={false} refresh={vi.fn()}
    transact={transact} wallet={wallet} connected={true} settled={false} activity={[]}
  />)
  return { view, transact }
}

afterEach(() => {
  if (root) act(() => root.unmount())
  container?.remove()
  vi.useRealTimers()
})

describe('remediation UI', () => {
  it('shows DRAFT cure policy and frozen policy after funding', () => {
    const agreement = baseAgreement({ status: 'DRAFT', item_count: 0, assessed_count: 0, open_cure_count: 0, cure_window_seconds: 0 })
    const props = {
      agreement: agreement as never, items: [], id: '1', setId: vi.fn(), loading: false, refresh: vi.fn(),
      transact: vi.fn(async () => ({ hash: '0xabc' })), wallet: landlord, connected: true, settled: false, activity: [],
    }
    const view = mount(<CaseView {...props} />)
    expect(view.textContent).toContain('Enable remediation / cure window')
    expect(view.textContent).toContain('immutable once the tenant funds')
    act(() => root.render(<CaseView {...props} agreement={{ ...agreement, status: 'ACTIVE', cure_window_seconds: 86400 } as never} />))
    expect(view.textContent).not.toContain('Save DRAFT cure policy')
    expect(view.textContent).toContain('Cure policy frozen when funded: 24.00 hours')
  })

  it('shows cure controls only for tenant on an eligible positive NEW_DAMAGE item', () => {
    const eligible = itemView(baseItem())
    expect(eligible.view.textContent).toContain('Original assessment')
    expect(eligible.view.textContent).toContain('NEW_DAMAGE / severity 2')
    expect(eligible.view.textContent).toContain('Effective deduction')
    expect(eligible.view.textContent).toContain('Submit remediation evidence')
    expect(eligible.view.textContent).toContain('Waive remediation')
    act(() => root.unmount())

    const landlordView = itemView(baseItem(), landlord)
    expect(landlordView.view.textContent).not.toContain('Submit remediation evidence')
    act(() => root.unmount())

    const disconnectedView = itemView(baseItem(), tenant, false)
    const disconnectedSubmit = [...disconnectedView.view.querySelectorAll('button')].find(button => button.textContent === 'Submit remediation evidence')!
    expect(disconnectedSubmit.disabled).toBe(true)
    act(() => root.unmount())

    const ordinaryView = itemView(baseItem({ verdict: 'NORMAL_WEAR', cure_status: 'NOT_APPLICABLE', original_deduction_wei: 0n }), tenant)
    expect(ordinaryView.view.textContent).not.toContain('Submit remediation evidence')
    expect(ordinaryView.view.textContent).not.toContain('Assess remediation')
  })

  it('validates HTTPS URL and SHA-256 before enabling the immutable evidence write', () => {
    const { view, transact } = caseView(baseItem())
    const submit = [...view.querySelectorAll('button')].find(button => button.textContent === 'Submit remediation evidence')!
    expect(submit.disabled).toBe(true)
    const url = view.querySelector('input[placeholder="https://…"]') as HTMLInputElement
    const hash = view.querySelector('input[placeholder="64 hexadecimal characters"]') as HTMLInputElement
    act(() => {
      fillInput(url, 'http://evidence.test/repair.jpg')
      fillInput(hash, 'c'.repeat(64))
    })
    expect(submit.disabled).toBe(true)
    act(() => fillInput(url, 'https://evidence.test/repair.jpg'))
    expect(submit.disabled).toBe(false)
    act(() => submit.click())
    expect(transact).toHaveBeenCalledWith('Submit remediation evidence', 'submit_cure_evidence', [1n, 1n, 'https://evidence.test/repair.jpg', 'c'.repeat(64)], 0n, '1')
  })

  it('renders RESTORED audit result and applies deadline-aware permissionless actions', () => {
    const restored = itemView(baseItem({ cure_status: 'RESTORED', cure_verdict: 'RESTORED', cure_reasoning: 'Restored to baseline.', cure_url: 'https://evidence.test/repair.jpg', cure_sha256: 'c'.repeat(64), cure_submitter: tenant, effective_deduction_wei: 0n }))
    expect(restored.view.textContent).toContain('RESTORED')
    expect(restored.view.textContent).toContain('Restored to baseline.')
    expect(restored.view.textContent).toContain('0.000 GEN')
    act(() => root.unmount())

    vi.useFakeTimers()
    vi.setSystemTime(new Date(1000 * 1000))
    const submitted = itemView(baseItem({ cure_status: 'SUBMITTED', cure_deadline: 1100 }), stranger)
    expect(submitted.view.textContent).toContain('Assess remediation')
    expect(submitted.view.textContent).not.toContain('Expire remediation')
    act(() => root.unmount())

    vi.setSystemTime(new Date(1101 * 1000))
    const expired = itemView(baseItem({ cure_status: 'SUBMITTED', cure_deadline: 1100 }), stranger)
    expect(expired.view.textContent).toContain('Expire remediation')
    expect(expired.view.textContent).not.toContain('Assess remediation')
  })

  it.each(['NOT_RESTORED', 'INCONCLUSIVE'] as const)('renders %s with the original deduction preserved', result => {
    const view = itemView(baseItem({ cure_status: result, cure_verdict: result, cure_reasoning: 'The material damage remains or cannot be verified.' }))
    expect(view.view.textContent).toContain(`Remediation${result}`)
    expect(view.view.textContent).toContain('0.500 GEN')
    expect(view.view.textContent).not.toContain('Assess remediation')
  })

  it('keeps submitted transaction receipts pending until final and distinguishes execution failure', () => {
    expect(classifyStudioTransaction({ statusName: 'ACCEPTED' }).state).toBe('pending')
    expect(classifyStudioTransaction({ statusName: 'FINALIZED', result_name: 'MAJORITY_AGREE', consensus_data: { leader_receipt: [{ mode: 'leader', execution_result: 'SUCCESS', result: { status: 'return' } }] } }).state).toBe('success')
    expect(classifyStudioTransaction({ statusName: 'FINALIZED', result_name: 'MAJORITY_AGREE', consensus_data: { leader_receipt: [{ mode: 'leader', execution_result: 'ERROR', result: { status: 'error' } }] } }).state).toBe('failed')
  })
})
