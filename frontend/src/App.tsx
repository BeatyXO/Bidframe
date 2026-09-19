import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, BadgeCheck, Building2, ChevronRight, CircleDollarSign, FileCheck2, Fingerprint, Gauge, Image as ImageIcon, LockKeyhole, Menu, Scale, ShieldCheck, Wallet, X } from 'lucide-react'
import { StatusPill } from './components/StatusPill'
import { CHAIN_HEX, CHAIN_ID, CONTRACT_ADDRESS, connectWallet, createInjectedWalletClient, explorerAddress, explorerTx, getAuthorizedWalletSnapshot, getInjectedProvider, inspectTransaction, isContractConfigured, readContract, submitContract, type TransactionOutcome, type WalletClient } from './lib/genlayer'

type Agreement = { id: number; title: string; property_ref: string; terms_hash: string; status: string; landlord: string; tenant: string; deposit_wei: bigint | string; item_count: number; assessed_count: number; raw_deduction_wei: bigint | string; settlement_deduction_wei: bigint | string; projected_refund_wei: bigint | string; has_inconclusive: boolean; inconclusive_count: number }
type Item = { id: number; label: string; description: string; baseline_url: string; baseline_sha256: string; checkout_url: string; checkout_sha256: string; checkout_submitter: string; evidence_challenged: boolean; replacement_url: string; replacement_proposer: string; assessed: boolean; verdict: string; severity: number; deduction_wei: bigint | string; reasoning: string; inconclusive_resolved: boolean; minor_wei: bigint | string; moderate_wei: bigint | string; severe_wei: bigint | string; missing_wei: bigint | string }
type TxStage = 'submitted' | 'finalizing' | 'finalized' | 'failed'
type TxState = { stage: TxStage; hash?: string; message: string }
type TxRecord = { label: string; hash: string; agreementId: string; status: TxStage; submittedAt: number; updatedAt: number; message: string }
const GEN = 10n ** 18n
const ACTIVITY_KEY = 'bidframe:transaction-activity:v1'
const LOCAL_DISCONNECT_KEY = 'bidframe:local-disconnect:v1'
const emptyItem = { label: '', description: '', baselineUrl: '', baselineHash: '', minor: '0', moderate: '0', severe: '0', missing: '0' }
function agreementFromUrl() { const value = new URLSearchParams(window.location.search).get('agreement') || ''; return /^\d+$/.test(value) && BigInt(value) > 0n ? value : '' }
function isHttpsUrl(value: string) { try { return new URL(value).protocol === 'https:' } catch { return false } }
function amount(value: bigint | string | number | undefined) { return BigInt(value ?? 0) }
function gen(value: bigint | string | number | undefined) { return `${(Number(amount(value)) / Number(GEN)).toFixed(3)} GEN` }
function genWei(value: string) { if (!/^\d+(\.\d{0,18})?$/.test(value)) throw new Error('Enter a non-negative GEN amount with at most 18 decimal places.'); const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * GEN + BigInt((fraction + '0'.repeat(18)).slice(0, 18)) }
function hashFile(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = async () => { try { const bytes = await crypto.subtle.digest('SHA-256', reader.result as ArrayBuffer); resolve(Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('')) } catch (e) { reject(e) } }; reader.onerror = () => reject(reader.error); reader.readAsArrayBuffer(file) }) }
function verdictTone(value: string) { return value === 'UNCHANGED' ? 'green' : value === 'NORMAL_WEAR' ? 'slate' : value === 'NEW_DAMAGE' ? 'amber' : value === 'MISSING' ? 'red' : 'purple' }
function loadActivity(): TxRecord[] { try { const raw = localStorage.getItem(ACTIVITY_KEY); const rows = raw ? JSON.parse(raw) : []; return Array.isArray(rows) ? rows.filter(row => row?.hash && row?.label).slice(0, 50) : [] } catch { return [] } }
function delay(ms: number) { return new Promise(resolve => window.setTimeout(resolve, ms)) }
async function waitForStudioFinality(hash: string, onProgress: (outcome: TransactionOutcome, attempt: number) => void | Promise<void>, onHeartbeat?: (attempt: number) => void | Promise<void>) {
  let attempt = 0
  while (true) {
    const hidden = document.hidden
    const waitMs = hidden ? 45000 : Math.min(8000 + attempt * 2000, 18000)
    await delay(waitMs)
    const outcome = await inspectTransaction(hash)
    await onProgress(outcome, attempt)
    if (outcome.state !== 'pending') return outcome
    attempt += 1
    if (attempt % 2 === 0) await onHeartbeat?.(attempt)
  }
}

export default function App() {
  const [wallet, setWallet] = useState('')
  const [client, setClient] = useState<WalletClient | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [active, setActive] = useState<'overview' | 'case' | 'create'>(() => agreementFromUrl() ? 'case' : 'overview')
  const [agreementId, setAgreementId] = useState(agreementFromUrl)
  const [agreement, setAgreement] = useState<Agreement | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [tx, setTx] = useState<TxState | null>(null)
  const [activity, setActivity] = useState<TxRecord[]>(loadActivity)
  const [wrongNetwork, setWrongNetwork] = useState(false)
  const [walletMenuOpen, setWalletMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const walletMenuRef = useRef<HTMLDivElement | null>(null)
  const reconcilingRef = useRef(new Set<string>())
  const configured = isContractConfigured()

  const updateActivity = useCallback((hash: string, patch: Partial<TxRecord> & Pick<TxRecord, 'hash'>) => {
    setActivity(previous => {
      const existing = previous.find(row => row.hash === hash)
      const nextRecord: TxRecord = {
        label: patch.label ?? existing?.label ?? 'StudioNet transaction',
        hash,
        agreementId: patch.agreementId ?? existing?.agreementId ?? '',
        status: patch.status ?? existing?.status ?? 'submitted',
        submittedAt: patch.submittedAt ?? existing?.submittedAt ?? Date.now(),
        updatedAt: patch.updatedAt ?? Date.now(),
        message: patch.message ?? existing?.message ?? 'Submitted to StudioNet.',
      }
      const next = [nextRecord, ...previous.filter(row => row.hash !== hash)].slice(0, 50)
      try { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next)) } catch { /* local history is best-effort */ }
      return next
    })
  }, [])

  const bindActivityToAgreement = useCallback((hash: string, id: string) => {
    if (!hash || !id) return
    updateActivity(hash, { hash, agreementId: id, updatedAt: Date.now() })
  }, [updateActivity])

  const refresh = useCallback(async (id: string, quiet = false) => {
    if (!configured || !id) return
    if (!quiet) { setLoading(true); setError('') }
    try {
      const a = await readContract<Agreement>('get_agreement', [BigInt(id)])
      const rows = await Promise.all(Array.from({ length: Number(a.item_count) }, (_, i) => readContract<Item>('get_item', [BigInt(id), BigInt(i + 1)])))
      setAgreement({ ...a, deposit_wei: amount(a.deposit_wei), raw_deduction_wei: amount(a.raw_deduction_wei), settlement_deduction_wei: amount(a.settlement_deduction_wei), projected_refund_wei: amount(a.projected_refund_wei) })
      setItems(rows)
    } catch (e) {
      if (!quiet) setError(e instanceof Error ? e.message : 'Unable to read agreement from StudioNet.')
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [configured])

  useEffect(() => { if (agreementId) void refresh(agreementId) }, [agreementId, refresh])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (agreementId) url.searchParams.set('agreement', agreementId)
    else url.searchParams.delete('agreement')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }, [agreementId])

  useEffect(() => {
    const syncFromHistory = () => {
      const linkedId = agreementFromUrl()
      setAgreementId(linkedId)
      if (linkedId) setActive('case')
    }
    window.addEventListener('popstate', syncFromHistory)
    return () => window.removeEventListener('popstate', syncFromHistory)
  }, [])

  const hydrateAuthorizedWallet = useCallback(async ({ announce = false, respectLocalDisconnect = true }: { announce?: boolean; respectLocalDisconnect?: boolean } = {}) => {
    if (respectLocalDisconnect && sessionStorage.getItem(LOCAL_DISCONNECT_KEY) === '1') return
    const snapshot = await getAuthorizedWalletSnapshot()
    if (!snapshot.provider || !snapshot.address) {
      setWallet('')
      setClient(null)
      setWrongNetwork(false)
      return
    }

    setWallet(snapshot.address)
    if (snapshot.chainId === CHAIN_HEX) {
      setClient(createInjectedWalletClient(snapshot.provider, snapshot.address))
      setWrongNetwork(false)
      setError('')
      if (announce) setNotice('Wallet session restored on GenLayer StudioNet · 61999.')
    } else {
      setClient(null)
      setWrongNetwork(true)
      if (announce) setNotice('Wallet is authorized, but writes are disabled until you switch to GenLayer StudioNet 61999.')
    }
  }, [])

  useEffect(() => {
    void hydrateAuthorizedWallet().catch(e => setError(e instanceof Error ? e.message : 'Unable to restore wallet session.'))
  }, [hydrateAuthorizedWallet])

  useEffect(() => {
    const provider = getInjectedProvider()
    if (!provider?.on) return

    const handleAccountsChanged = (...args: unknown[]) => {
      if (sessionStorage.getItem(LOCAL_DISCONNECT_KEY) === '1') return
      const supplied = Array.isArray(args[0]) ? args[0].map(String) : []
      if (supplied.length === 0) {
        setWallet('')
        setClient(null)
        setWrongNetwork(false)
        setWalletMenuOpen(false)
        return
      }
      void hydrateAuthorizedWallet({ announce: true, respectLocalDisconnect: false }).catch(e => setError(e instanceof Error ? e.message : 'Unable to update wallet account.'))
    }
    const handleChainChanged = (...args: unknown[]) => {
      if (sessionStorage.getItem(LOCAL_DISCONNECT_KEY) === '1') return
      const chainId = String(args[0] ?? '').toLowerCase()
      if (chainId === CHAIN_HEX) {
        void hydrateAuthorizedWallet({ announce: true, respectLocalDisconnect: false }).catch(e => setError(e instanceof Error ? e.message : 'Unable to restore StudioNet wallet session.'))
      } else {
        setClient(null)
        setWrongNetwork(true)
        setNotice('Wallet left StudioNet. Reads remain available; reconnect to switch back to chain 61999 before writing.')
      }
    }

    provider.on('accountsChanged', handleAccountsChanged)
    provider.on('chainChanged', handleChainChanged)
    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged)
      provider.removeListener?.('chainChanged', handleChainChanged)
    }
  }, [hydrateAuthorizedWallet])

  useEffect(() => {
    if (!walletMenuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(event.target as Node)) setWalletMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setWalletMenuOpen(false) }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [walletMenuOpen])

  useEffect(() => {
    if (active !== 'case' || !agreementId) return
    const sync = () => { if (!document.hidden) void refresh(agreementId, true) }
    const interval = window.setInterval(sync, 30000)
    const onVisibility = () => { if (!document.hidden) sync() }
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active, agreementId, refresh])

  useEffect(() => {
    const pending = activity.filter(row => row.status === 'submitted' || row.status === 'finalizing')
    for (const record of pending) {
      if (reconcilingRef.current.has(record.hash)) continue
      reconcilingRef.current.add(record.hash)
      void waitForStudioFinality(
        record.hash,
        async (outcome, attempt) => {
          if (outcome.state === 'pending') {
            const message = attempt >= 2 ? 'Still finalizing on StudioNet.' : 'Submitted · waiting for StudioNet finalization.'
            updateActivity(record.hash, { hash: record.hash, status: 'finalizing', message, updatedAt: Date.now() })
            if (record.agreementId === agreementId) setTx({ stage: 'finalizing', hash: record.hash, message: `${record.label}: ${message}` })
          }
        },
        async () => {
          if (record.agreementId && record.agreementId === agreementId && !document.hidden) await refresh(record.agreementId, true)
        },
      ).then(async outcome => {
        if (outcome.state === 'success') {
          updateActivity(record.hash, { hash: record.hash, status: 'finalized', message: outcome.message, updatedAt: Date.now() })
          if (record.agreementId === agreementId) {
            setTx({ stage: 'finalized', hash: record.hash, message: `${record.label}: finalized successfully.` })
            await refresh(record.agreementId, true)
          }
        } else {
          updateActivity(record.hash, { hash: record.hash, status: 'failed', message: outcome.message, updatedAt: Date.now() })
          if (record.agreementId === agreementId) {
            setTx({ stage: 'failed', hash: record.hash, message: `${record.label}: ${outcome.message}` })
            setError(`${record.label} finalized without successful execution: ${outcome.message}`)
          }
        }
      }).finally(() => reconcilingRef.current.delete(record.hash))
    }
  }, [activity, agreementId, refresh, updateActivity])

  async function connect() {
    try {
      sessionStorage.removeItem(LOCAL_DISCONNECT_KEY)
      setError('')
      setNotice('')
      setWalletMenuOpen(false)
      const result = await connectWallet()
      setWallet(result.address)
      setClient(result.client)
      setWrongNetwork(false)
      setNotice('Connected to GenLayer StudioNet · 61999.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wallet connection failed.')
    }
  }

  async function copyWalletAddress() {
    if (!wallet) return
    try {
      await navigator.clipboard.writeText(wallet)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setError('Unable to copy the wallet address from this browser.')
    }
  }

  function disconnectLocal() {
    sessionStorage.setItem(LOCAL_DISCONNECT_KEY, '1')
    setWallet('')
    setClient(null)
    setWrongNetwork(false)
    setWalletMenuOpen(false)
    setCopied(false)
    setNotice('')
    setError('')
  }

  async function transact(label: string, functionName: string, args: unknown[], value = 0n, refreshId = agreementId): Promise<{ hash: string; returnValue?: unknown } | undefined> {
    if (!client) {
      setError(wrongNetwork ? 'Switch the wallet to GenLayer StudioNet 61999 before writing.' : 'Connect an injected wallet before writing.')
      return
    }

    setError('')
    setNotice('')
    setTx({ stage: 'submitted', message: `${label}: submitting to StudioNet…` })
    let hash = ''
    try {
      const submitted = await submitContract(client, functionName, args, value)
      hash = submitted.hash
      const record: TxRecord = {
        label,
        hash,
        agreementId: refreshId || '',
        status: 'finalizing',
        submittedAt: Date.now(),
        updatedAt: Date.now(),
        message: 'Submitted · waiting for StudioNet finalization.',
      }
      reconcilingRef.current.add(hash)
      updateActivity(hash, { ...record, hash })
      setTx({ stage: 'finalizing', hash, message: `${label}: Submitted · waiting for StudioNet finalization.` })

      const outcome = await waitForStudioFinality(
        hash,
        async (current, attempt) => {
          if (current.state === 'pending') {
            const message = attempt >= 2 ? 'Still finalizing on StudioNet.' : 'Submitted · waiting for StudioNet finalization.'
            updateActivity(hash, { hash, status: 'finalizing', message, updatedAt: Date.now() })
            setTx({ stage: 'finalizing', hash, message: `${label}: ${message}` })
          }
        },
        async () => {
          if (refreshId && !document.hidden) await refresh(refreshId, true)
        },
      )

      if (outcome.state === 'success') {
        updateActivity(hash, { hash, status: 'finalized', message: outcome.message, updatedAt: Date.now() })
        setTx({ stage: 'finalized', hash, message: `${label}: finalized successfully.` })
        setNotice(`${label} is finalized. State refreshed from the contract.`)
        if (refreshId) await refresh(refreshId, true)
        return { hash }
      }

      updateActivity(hash, { hash, status: 'failed', message: outcome.message, updatedAt: Date.now() })
      setTx({ stage: 'failed', hash, message: `${label}: ${outcome.message}` })
      setError(`${label} finalized without successful execution: ${outcome.message}`)
      return
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Transaction submission failed.'
      if (hash) {
        // Once a hash exists, uncertain RPC/read errors are reconciled rather than
        // converted into false terminal failures.
        updateActivity(hash, { hash, status: 'finalizing', message: 'Still finalizing on StudioNet.', updatedAt: Date.now() })
        setTx({ stage: 'finalizing', hash, message: `${label}: Still finalizing on StudioNet.` })
      } else {
        setTx({ stage: 'failed', message })
        setError(message)
      }
      return
    } finally {
      if (hash) reconcilingRef.current.delete(hash)
    }
  }

  const progress = useMemo(() => agreement?.item_count ? Math.round(agreement.assessed_count / agreement.item_count * 100) : 0, [agreement])
  const settled = agreement?.status === 'SETTLED'

  return <div className="app-shell">
    <header className="topbar"><button className="brand" onClick={() => setActive('overview')}><span className="brand-mark"><Scale size={18} /></span><span>Bidframe</span></button>
      <nav className="desktop-nav"><button className={active === 'overview' ? 'nav-active' : ''} onClick={() => setActive('overview')}>Overview</button><button className={active === 'case' ? 'nav-active' : ''} onClick={() => setActive('case')}>Settlement case</button><button className={active === 'create' ? 'nav-active' : ''} onClick={() => setActive('create')}>New agreement</button></nav>
      <div className="top-actions"><span className="network-chip"><span className="network-dot" /> StudioNet · {CHAIN_ID}</span><button className="wallet-btn" onClick={connect}><Wallet size={16} />{wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : 'Connect wallet'}</button><button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button></div>
    </header>
    {mobileOpen && <div className="mobile-menu"><button onClick={() => { setActive('overview'); setMobileOpen(false) }}>Overview</button><button onClick={() => { setActive('case'); setMobileOpen(false) }}>Settlement case</button><button onClick={() => { setActive('create'); setMobileOpen(false) }}>New agreement</button></div>}
    {error && <div className="toast error-toast">{error}</div>}{notice && <div className="toast">{notice}</div>}
    {tx && <div className={`tx-banner ${tx.stage}`}><span className="tx-dot" /><b>{tx.message}</b>{tx.hash && <a href={explorerTx(tx.hash)} target="_blank" rel="noreferrer">Transaction {tx.hash.slice(0, 10)}… <ArrowUpRight size={13} /></a>}</div>}
    {!configured && <div className="demo-banner"><ShieldCheck size={15} /> Live mode is unavailable until <code>VITE_CONTRACT_ADDRESS</code> contains the deployed StudioNet 61999 contract. No sample case is shown.</div>}
    <main>{active === 'overview' && <Overview agreement={agreement} progress={progress} onOpen={() => setActive('case')} onLoad={id => { setAgreementId(id); void refresh(id); setActive('case') }} />}
      {active === 'case' && <CaseView agreement={agreement} items={items} id={agreementId} setId={setAgreementId} loading={loading} refresh={id => void refresh(id)} transact={transact} wallet={wallet} settled={Boolean(settled)} />}
      {active === 'create' && <CreateView connected={Boolean(wallet)} wallet={wallet} connect={connect} transact={transact} setAgreementId={setAgreementId} refresh={refresh} setActive={setActive} />}</main>
    <footer><div className="footer-brand"><span className="brand-mark mini"><Scale size={14} /></span> Bidframe</div><p>Evidence-bound security-deposit settlement. One Intelligent Contract. StudioNet 61999.</p><div className="footer-links">{configured && <a href={explorerAddress(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer">Contract <ArrowUpRight size={13} /></a>}<a href="https://studio.genlayer.com" target="_blank" rel="noreferrer">GenLayer Studio <ArrowUpRight size={13} /></a></div></footer>
  </div>
}

// Keep an immediate hash visible, then wait for the SDK's finalized receipt and verify execution success.
async function submitAndTrack(client: WalletClient, functionName: string, args: unknown[], value: bigint, label: string, setTx: (state: TxState) => void) {
  const { hash, finalized } = await submitContract(client, functionName, args, value)
  setTx({ stage: 'finalizing', hash, message: `${label}: submitted; waiting for consensus finalization…` })
  const receipt = await finalized
  await assertSuccessfulFinalizedTransaction(hash, receipt)
  return { hash, receipt, returnValue: receipt.data?.return_value ?? receipt.data?.result ?? receipt.data?.returnValue }
}

function Overview({ agreement, progress, onOpen, onLoad }: { agreement: Agreement | null; progress: number; onOpen: () => void; onLoad: (id: string) => void }) {
  const [id, setId] = useState('')
  return <><section className="hero page-width"><div className="hero-copy"><StatusPill>Consensus security-deposit settlement</StatusPill><h1>Physical condition,<br /><span>settled by evidence.</span></h1><p>Bidframe binds move-in evidence, deduction caps and deposit funds before checkout. GenLayer validators classify the condition change; deterministic contract logic calculates the money.</p><div className="hero-actions"><button className="primary-btn" onClick={onOpen}>Open settlement case <ChevronRight size={17} /></button><a className="text-link" href="https://docs.genlayer.com/developers/intelligent-contracts/features/image-processing" target="_blank" rel="noreferrer">How consensus sees evidence <ArrowUpRight size={14} /></a></div></div>
    <div className="hero-panel"><div className="hero-panel-top"><div><span className="eyebrow">LIVE STUDIO CONTRACT</span><h3>{agreement?.title || 'No agreement loaded'}</h3></div><StatusPill tone={agreement ? 'purple' : 'slate'}>{agreement?.status || 'Live reads only'}</StatusPill></div>{agreement ? <><div className="lock-visual"><LockKeyhole size={29} /><div><strong>{gen(agreement.deposit_wei)}</strong><span>deposit state from contract</span></div></div><div className="progress-head"><span>Evidence assessment</span><strong>{agreement.assessed_count}/{agreement.item_count}</strong></div><div className="progress"><i style={{ width: `${progress}%` }} /></div><div className="mini-grid"><div><span>Deduction</span><strong>{gen(agreement.settlement_deduction_wei)}</strong></div><div><span>Refund</span><strong>{gen(agreement.projected_refund_wei)}</strong></div></div></> : <p className="empty-copy">Enter an agreement ID to read the current on-chain state.</p>}<form className="load-case" onSubmit={e => { e.preventDefault(); if (id) onLoad(id) }}><input aria-label="Agreement ID" type="number" min="1" placeholder="Agreement ID" value={id} onChange={e => setId(e.target.value)} /><button className="panel-link">Load case <ArrowUpRight size={15} /></button></form></div></section>
    <section className="page-width proof-strip"><div><ShieldCheck /><span><b>Frozen inputs</b>Evidence hashes and rules cannot change after funding.</span></div><div><ImageIcon /><span><b>Vision consensus</b>Validators inspect before and after images.</span></div><div><Gauge /><span><b>Bounded verdicts</b>The model cannot invent prices or recipients.</span></div><div><CircleDollarSign /><span><b>Deterministic payout</b>Frozen caps determine each deduction.</span></div></section>
    <section className="page-width section-block"><div className="section-heading"><div><span className="eyebrow">WHY BIDFRAME</span><h2>Judgment where code stops.<br />Code where judgment should stop.</h2></div><p>The contract gives AI one narrow job: classify condition change inside a closed vocabulary. Everything economically sensitive remains deterministic.</p></div><div className="three-cards"><Feature icon={<Fingerprint />} title="Evidence-bound">Baseline and checkout media are pinned by SHA-256 and checked before assessment.</Feature><Feature icon={<Scale />} title="Consensus-classified">UNCHANGED, NORMAL_WEAR, NEW_DAMAGE, MISSING or INCONCLUSIVE.</Feature><Feature icon={<FileCheck2 />} title="Settlement-safe">Normal wear is zero. Frozen caps set damage deductions, bounded by the deposit.</Feature></div></section>
    <section className="page-width architecture-card"><div><span className="eyebrow light">SINGLE-CONTRACT ARCHITECTURE</span><h2>One state machine from deposit to settlement.</h2><p>The same Intelligent Contract holds GEN, stores frozen rules, records evidence and releases the final amounts.</p></div><div className="state-flow"><span>DRAFT</span><i>→</i><span>ACTIVE</span><i>→</i><span>CHECKOUT</span><i>→</i><span>ASSESSING</span><i>→</i><span>READY</span><i>→</i><span>SETTLED</span></div><div className="arch-foot"><span><BadgeCheck size={16} /> Stable StudioNet</span><b>Chain ID 61999</b>{isContractConfigured() && <a href={explorerAddress(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer">View deployed contract ↗</a>}</div></section></>
}
function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: string }) { return <article className="feature-card"><span className="icon-box">{icon}</span><h3>{title}</h3><p>{children}</p></article> }

function CaseView({ agreement, items, id, setId, loading, refresh, transact, wallet, settled }: { agreement: Agreement | null; items: Item[]; id: string; setId: (v: string) => void; loading: boolean; refresh: (id?: string) => void; transact: (label: string, fn: string, args: unknown[], value?: bigint, id?: string) => Promise<{ hash: string } | undefined>; wallet: string; settled: boolean }) {
  const [loadId, setLoadId] = useState(id); const [evidence, setEvidence] = useState<Record<number, { url: string; hash: string }>>({}); const [replacement, setReplacement] = useState<Record<number, { url: string; hash: string }>>({})
  const [draftItem, setDraftItem] = useState({ ...emptyItem })
  const [draftHint, setDraftHint] = useState('')
  const setEvidenceHash = async (itemId: number, field: 'evidence' | 'replacement', file?: File) => { if (!file) return; const hash = await hashFile(file); (field === 'evidence' ? setEvidence : setReplacement)(state => ({ ...state, [itemId]: { ...state[itemId], hash } })) }
  const ready = Boolean(agreement && agreement.item_count > 0 && agreement.assessed_count === agreement.item_count && !agreement.has_inconclusive)
  const landlord = Boolean(wallet && agreement && wallet.toLowerCase() === agreement.landlord.toLowerCase())
  const tenant = Boolean(wallet && agreement && wallet.toLowerCase() === agreement.tenant.toLowerCase())
  function updateDraftItem(key: keyof typeof emptyItem, value: string) { setDraftItem(row => ({ ...row, [key]: value })) }
  async function registerDraftItem() {
    if (!agreement || agreement.status !== 'DRAFT' || !landlord) return
    setDraftHint('')
    try {
      if (!draftItem.label.trim()) throw new Error('Item label is required.')
      if (!draftItem.description.trim()) throw new Error('Item description is required.')
      if (!isHttpsUrl(draftItem.baselineUrl)) throw new Error('Baseline evidence URL must use HTTPS.')
      if (!/^[a-fA-F0-9]{64}$/.test(draftItem.baselineHash)) throw new Error('Baseline SHA-256 must be exactly 64 hexadecimal characters.')
      const args = [
        BigInt(agreement.id),
        draftItem.label.trim(),
        draftItem.description.trim(),
        draftItem.baselineUrl.trim(),
        draftItem.baselineHash.toLowerCase(),
        genWei(draftItem.minor || '0'),
        genWei(draftItem.moderate || '0'),
        genWei(draftItem.severe || '0'),
        genWei(draftItem.missing || '0'),
      ]
      const result = await transact('Register inventory item', 'add_item', args, 0n, String(agreement.id))
      if (result) {
        setDraftItem({ ...emptyItem })
        setDraftHint(`Inventory item finalized. Agreement #${agreement.id} was refreshed from StudioNet.`)
      }
    } catch (e) {
      setDraftHint(e instanceof Error ? e.message : 'Unable to register inventory item.')
    }
  }
  return <section className="page-width case-page"><div className="case-title-row"><div><span className="eyebrow">CONTRACT READS · STUDIO 61999</span><h1>{agreement?.title || 'Settlement case'}</h1><p>{agreement ? `${agreement.property_ref} · landlord ${agreement.landlord} · tenant ${agreement.tenant}` : 'Load an agreement by its on-chain ID.'}</p></div><form className="case-load" onSubmit={e => { e.preventDefault(); setId(loadId); refresh(loadId) }}><input type="number" min="1" placeholder="Agreement ID" value={loadId} onChange={e => setLoadId(e.target.value)} /><button className="secondary-btn">Load</button></form></div>
    {!agreement ? <div className="empty-state">{loading ? 'Reading StudioNet…' : 'No agreement loaded. Enter its ID above or create a new agreement.'}</div> : <>
      <div className="metric-grid"><Metric icon={<LockKeyhole />} label="Deposit" value={gen(agreement.deposit_wei)} sub={agreement.status} /><Metric icon={<Scale />} label="Current deduction" value={gen(agreement.settlement_deduction_wei)} sub="from frozen schedule" /><Metric icon={<BadgeCheck />} label="Assessed" value={`${agreement.assessed_count}/${agreement.item_count}`} sub={`${Math.round(agreement.assessed_count / Math.max(agreement.item_count, 1) * 100)}% complete`} /><Metric icon={<ShieldCheck />} label="Tenant refund" value={gen(agreement.projected_refund_wei)} sub={agreement.has_inconclusive ? 'INCONCLUSIVE · settlement blocked' : 'deterministic projection'} /></div>
      <div className="lifecycle-actions">
        {agreement.status === 'DRAFT' && tenant && agreement.item_count > 0 && <button className="primary-btn" onClick={() => void transact('Fund exact deposit', 'fund_agreement', [BigInt(agreement.id)], amount(agreement.deposit_wei), String(agreement.id))}>Fund exact deposit · {gen(agreement.deposit_wei)}</button>}
        {agreement.status === 'DRAFT' && tenant && agreement.item_count === 0 && <div className="draft-gate-message"><LockKeyhole size={16} /><span>Landlord must register at least one inventory item before funding.</span></div>}
        {agreement.status === 'ACTIVE' && <button className="secondary-btn" onClick={() => void transact('Open checkout', 'open_checkout', [BigInt(agreement.id)], 0n, String(agreement.id))}>Open checkout</button>}
        {agreement.status === 'ASSESSING' && <button className="primary-btn" disabled={!ready} title={!ready ? 'Every item must be assessed and none may be INCONCLUSIVE.' : ''} onClick={() => void transact('Mark READY', 'mark_ready', [BigInt(agreement.id)], 0n, String(agreement.id))}>Mark READY</button>}
        {agreement.status === 'READY' && <button className="primary-btn" onClick={() => void transact('Settle', 'settle', [BigInt(agreement.id)], 0n, String(agreement.id))}>Settle agreement</button>}
        {settled && <StatusPill tone="green">Settled · deduction {gen(agreement.settlement_deduction_wei)} · refund {gen(agreement.projected_refund_wei)}</StatusPill>}
        {loading && <span>Refreshing contract state…</span>}
      </div>
      {agreement.status === 'DRAFT' && landlord && <section className="form-card draft-inventory-card">
        <div className="form-head"><div><span className="eyebrow">DRAFT AGREEMENT · LANDLORD</span><h2>Register inventory item</h2></div><ImageIcon /></div>
        <p className="empty-copy">Add one or more move-in inventory records before the tenant funds. Each successful item is stored on-chain immediately.</p>
        <div className="inventory-form">
          <label>Item label<input value={draftItem.label} onChange={e => updateDraftItem('label', e.target.value)} placeholder="e.g. Living-room window" /></label>
          <label>Description<input value={draftItem.description} onChange={e => updateDraftItem('description', e.target.value)} placeholder="Condition and identifying details at move-in" /></label>
          <label>Baseline HTTPS evidence URL<input type="url" value={draftItem.baselineUrl} onChange={e => updateDraftItem('baselineUrl', e.target.value)} placeholder="https://…" /></label>
          <label>Baseline image file for browser SHA-256<input type="file" accept="image/*" onChange={async e => { const file = e.target.files?.[0]; if (file) updateDraftItem('baselineHash', await hashFile(file)) }} /></label>
          <label>Baseline SHA-256<input value={draftItem.baselineHash} onChange={e => updateDraftItem('baselineHash', e.target.value)} placeholder="64 hexadecimal characters" /></label>
          {draftItem.baselineHash && <code>SHA-256 {draftItem.baselineHash}</code>}
          <div className="four-col">{(['minor', 'moderate', 'severe', 'missing'] as const).map(key => <label key={key}>{key} deduction (GEN)<input type="number" min="0" step="any" value={draftItem[key]} onChange={e => updateDraftItem(key, e.target.value)} /></label>)}</div>
          <div className="form-note"><ShieldCheck size={16} />These GEN amounts are the frozen deterministic schedule. UNCHANGED and NORMAL_WEAR always deduct zero.</div>
          {draftHint && <p className="draft-hint">{draftHint}</p>}
          <button className="primary-btn" disabled={!draftItem.label.trim() || !draftItem.description.trim() || !isHttpsUrl(draftItem.baselineUrl) || !/^[a-fA-F0-9]{64}$/.test(draftItem.baselineHash)} onClick={() => void registerDraftItem()}>Register inventory item</button>
        </div>
      </section>}
      <div className="case-grid"><div className="evidence-card"><div className="card-head"><div><span className="eyebrow">EVIDENCE MATRIX</span><h2>Registered inventory</h2></div><span className="hash-chip">Terms {agreement.terms_hash.slice(0, 10)}…</span></div>{items.length === 0 ? <p className="empty-copy">No inventory items have been registered.</p> : items.map(item => <ItemCard key={item.id} item={item} agreement={agreement} wallet={wallet} evidence={evidence[item.id] || { url: '', hash: '' }} replacement={replacement[item.id] || { url: '', hash: '' }} setEvidence={value => setEvidence(s => ({ ...s, [item.id]: value }))} setReplacement={value => setReplacement(s => ({ ...s, [item.id]: value }))} setEvidenceHash={file => void setEvidenceHash(item.id, 'evidence', file)} setReplacementHash={file => void setEvidenceHash(item.id, 'replacement', file)} transact={(label, fn, args) => void transact(label, fn, args)} />)}</div><aside className="settlement-card"><span className="eyebrow">{settled ? 'FINAL SETTLEMENT' : 'PROJECTED SETTLEMENT'}</span><h3>{gen(agreement.projected_refund_wei)}</h3><p>{settled ? 'refunded to tenant' : 'projected tenant refund'}</p><div className="settlement-bar"><i style={{ width: `${Math.min(100, Number(amount(agreement.settlement_deduction_wei) * 100n / (amount(agreement.deposit_wei) || 1n)))}%` }} /></div><dl><div><dt>Deposit</dt><dd>{gen(agreement.deposit_wei)}</dd></div><div><dt>Landlord deduction</dt><dd>− {gen(agreement.settlement_deduction_wei)}</dd></div><div className="total"><dt>Tenant refund</dt><dd>{gen(agreement.projected_refund_wei)}</dd></div></dl><div className="notice"><ShieldCheck size={17} /><p><b>{agreement.has_inconclusive ? 'Automatic settlement blocked.' : ready || settled ? 'All evidence resolved.' : 'Settlement remains locked.'}</b> {!ready && !settled && 'Every item must be assessed and no item may be INCONCLUSIVE.'}</p></div></aside></div>
    </>}</section>
}
function ItemCard({ item, agreement, wallet, evidence, replacement, setEvidence, setReplacement, setEvidenceHash, setReplacementHash, transact }: { item: Item; agreement: Agreement; wallet: string; evidence: { url: string; hash: string }; replacement: { url: string; hash: string }; setEvidence: (v: { url: string; hash: string }) => void; setReplacement: (v: { url: string; hash: string }) => void; setEvidenceHash: (f?: File) => void; setReplacementHash: (f?: File) => void; transact: (label: string, fn: string, args: unknown[]) => void }) {
  const counterparty = wallet.toLowerCase() !== item.checkout_submitter?.toLowerCase()
  return <article className="item-card"><div className="item-card-title"><div><h3>{item.id}. {item.label}</h3><p>{item.description}</p></div>{item.assessed ? <StatusPill tone={verdictTone(item.verdict)}>{item.verdict}</StatusPill> : <StatusPill tone={item.evidence_challenged ? 'amber' : 'slate'}>{item.evidence_challenged ? 'CHALLENGED' : item.checkout_url ? 'EVIDENCE SUBMITTED' : 'AWAITING EVIDENCE'}</StatusPill>}</div><div className="hash-row"><span><Fingerprint size={13} /> Move-in {item.baseline_sha256.slice(0, 14)}…</span><span><Fingerprint size={13} /> Move-out {item.checkout_sha256 ? `${item.checkout_sha256.slice(0, 14)}…` : 'not submitted'}</span></div>{item.assessed && <div className="verdict-detail"><b>{item.verdict} · severity {item.severity}/3 · deduction {gen(item.deduction_wei)}</b><p>{item.reasoning || 'No reasoning was returned.'}</p>{item.verdict === 'INCONCLUSIVE' && !item.inconclusive_resolved && <button className="secondary-btn" onClick={() => transact('Resolve INCONCLUSIVE at zero', 'resolve_inconclusive_zero', [BigInt(agreement.id), BigInt(item.id)])}>Resolve at zero deduction</button>}{item.inconclusive_resolved && <StatusPill tone="green">Resolved at zero deduction</StatusPill>}</div>}
    {agreement.status === 'CHECKOUT' || agreement.status === 'ASSESSING' ? <div className="item-controls">{!item.checkout_url && !item.assessed && <><label>Move-out evidence URL<input type="url" placeholder="https://…" value={evidence.url} onChange={e => setEvidence({ ...evidence, url: e.target.value })} /></label><label>Evidence file for SHA-256<input type="file" accept="image/*" onChange={e => setEvidenceHash(e.target.files?.[0])} /></label>{evidence.hash && <code>SHA-256 {evidence.hash}</code>}<button className="secondary-btn" disabled={!evidence.url || !evidence.hash} onClick={() => transact('Submit evidence', 'submit_checkout_evidence', [BigInt(agreement.id), BigInt(item.id), evidence.url, evidence.hash])}>Submit move-out evidence</button></>}{item.checkout_url && !item.assessed && <div className="item-button-row"><button className="secondary-btn" disabled={!counterparty || item.evidence_challenged} title={!counterparty ? 'Only the counterparty can challenge submitted evidence.' : ''} onClick={() => transact('Challenge evidence', 'challenge_checkout_evidence', [BigInt(agreement.id), BigInt(item.id)])}>Challenge evidence</button>{item.evidence_challenged && <><label>Replacement URL<input type="url" placeholder="https://…" value={replacement.url} onChange={e => setReplacement({ ...replacement, url: e.target.value })} /></label><label>Replacement image<input type="file" accept="image/*" onChange={e => setReplacementHash(e.target.files?.[0])} /></label>{replacement.hash && <code>SHA-256 {replacement.hash}</code>}<button className="secondary-btn" disabled={!replacement.url || !replacement.hash} onClick={() => transact('Propose replacement', 'propose_replacement_evidence', [BigInt(agreement.id), BigInt(item.id), replacement.url, replacement.hash])}>Propose replacement</button><button className="secondary-btn" onClick={() => transact('Accept replacement', 'accept_replacement_evidence', [BigInt(agreement.id), BigInt(item.id)])}>Accept replacement</button><button className="secondary-btn" onClick={() => transact('Waive challenged item', 'resolve_challenged_zero', [BigInt(agreement.id), BigInt(item.id)])}>Resolve challenge at zero deduction</button></>}{!item.evidence_challenged && <button className="primary-btn" onClick={() => transact('Assess item', 'assess_item', [BigInt(agreement.id), BigInt(item.id)])}>Run consensus assessment</button>}</div>}</div> : null}
    <div className="schedule-line">Frozen caps · minor {gen(item.minor_wei)} · moderate {gen(item.moderate_wei)} · severe {gen(item.severe_wei)} · missing {gen(item.missing_wei)}</div></article>
}
function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) { return <div className="metric"><span className="metric-icon">{icon}</span><div><p>{label}</p><strong>{value}</strong><span>{sub}</span></div></div> }

function CreateView({ connected, wallet, connect, transact, setAgreementId, refresh, setActive }: { connected: boolean; wallet: string; connect: () => void; transact: (label: string, fn: string, args: unknown[], value?: bigint, id?: string) => Promise<{ hash: string; returnValue?: unknown } | undefined>; setAgreementId: (id: string) => void; refresh: (id?: string) => Promise<void>; setActive: (v: 'overview' | 'case' | 'create') => void }) {
  const [step, setStep] = useState(1); const [title, setTitle] = useState(''); const [property, setProperty] = useState(''); const [tenant, setTenant] = useState(''); const [deposit, setDeposit] = useState(''); const [termsHash, setTermsHash] = useState(''); const [items, setItems] = useState([{ ...emptyItem }]); const [createdId, setCreatedId] = useState(''); const [createTxHash, setCreateTxHash] = useState('')
  function update(index: number, key: keyof typeof emptyItem, value: string) { setItems(rows => rows.map((row, i) => i === index ? { ...row, [key]: value } : row)) }
  async function addCurrentItem() { if (!createdId) return; try { const row = items[items.length - 1]; const result = await transact(`Register inventory item ${items.length}`, 'add_item', [BigInt(createdId), row.label, row.description, row.baselineUrl, row.baselineHash, genWei(row.minor || '0'), genWei(row.moderate || '0'), genWei(row.severe || '0'), genWei(row.missing || '0')], 0n, createdId); if (result) setItems(prev => [...prev, { ...emptyItem }]) } catch (e) { setCreateHint(e instanceof Error ? e.message : 'Check GEN values and try again.') } }
  const [createHint, setCreateHint] = useState('')
  async function createAndCapture() { try { const depositWei = genWei(deposit); if (depositWei <= 0n) throw new Error('Deposit must be greater than zero.'); const res = await transact('Create agreement', 'create_agreement', [title, property, tenant, depositWei, termsHash]); if (!res) return; setCreateTxHash(res.hash); try { const id = String(await readContract<number>('get_latest_agreement_for_landlord', [wallet])); setCreatedId(id); setAgreementId(id); setCreateHint(`Agreement #${id} finalized. Its ID is now preserved in the URL; inventory registration can continue here or from Settlement case after any reload.`) } catch (e) { setCreateHint(e instanceof Error ? e.message : 'Agreement finalized. Load its ID using the linked transaction details.') } } catch (e) { setCreateHint(e instanceof Error ? e.message : 'Enter a valid deposit amount.') } }
  return <section className="page-width create-page"><div className="create-intro"><StatusPill>Create agreement</StatusPill><h1>Freeze the rules before<br />the deposit moves.</h1><p>Register parties, evidence and item-specific caps first. Funding locks the schedule so later condition judgments cannot change the money.</p></div><div className="create-layout"><ol className="steps">{['Agreement', 'Inventory', 'Fund & checkout'].map((label, i) => <li key={label} className={step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}><span>{step > i + 1 ? '✓' : i + 1}</span><div><b>{label}</b><small>{i === 0 ? 'Parties & deposit' : i === 1 ? 'Evidence & frozen caps' : 'Tenant funds exact amount'}</small></div></li>)}</ol><div className="form-card">
    {step === 1 && <><div className="form-head"><div><span className="eyebrow">STEP 01</span><h2>Agreement details</h2></div><Building2 /></div><label>Agreement title<input value={title} onChange={e => setTitle(e.target.value)} /></label><div className="two-col"><label>Property reference<input value={property} onChange={e => setProperty(e.target.value)} /></label><label>Deposit (GEN)<input type="number" min="0.000000000000000001" step="0.000000000000000001" value={deposit} onChange={e => setDeposit(e.target.value)} /></label></div><label>Tenant wallet<input placeholder="0x…" value={tenant} onChange={e => setTenant(e.target.value)} /></label><label>Frozen terms SHA-256<input placeholder="64 hex characters" value={termsHash} onChange={e => setTermsHash(e.target.value)} /></label><div className="form-note"><LockKeyhole size={16} />Terms and deposit become immutable when the tenant funds.</div></>}
    {step === 2 && <><div className="form-head"><div><span className="eyebrow">STEP 02</span><h2>Register inventory</h2></div><ImageIcon /></div>{items.map((item, i) => <div className="inventory-form" key={i}><h3>Item {i + 1}</h3><label>Item label<input value={item.label} onChange={e => update(i, 'label', e.target.value)} /></label><label>Description<input value={item.description} onChange={e => update(i, 'description', e.target.value)} /></label><label>Baseline HTTPS evidence URL<input type="url" value={item.baselineUrl} onChange={e => update(i, 'baselineUrl', e.target.value)} /></label><label>Baseline image file for SHA-256<input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) update(i, 'baselineHash', await hashFile(f)) }} /></label><label>Baseline SHA-256<input value={item.baselineHash} onChange={e => update(i, 'baselineHash', e.target.value)} /></label><div className="four-col">{(['minor', 'moderate', 'severe', 'missing'] as const).map(k => <label key={k}>{k}<input type="number" min="0" step="any" value={item[k]} onChange={e => update(i, k, e.target.value)} /></label>)}</div><div className="form-note"><ShieldCheck size={16} />The values above are frozen GEN caps. Ordinary wear and unchanged condition always deduct zero.</div></div>)}</>}
    {step === 3 && <><div className="form-head"><div><span className="eyebrow">STEP 03</span><h2>Finalize agreement</h2></div><FileCheck2 /></div><div className="review-box"><div><span>Deposit</span><strong>{deposit || '—'} GEN</strong></div><div><span>Inventory ready</span><strong>{items.length - (createdId ? 1 : 0)} items</strong></div><div><span>Network</span><strong>StudioNet · 61999</strong></div><div><span>Contract</span><strong>One Intelligent Contract</strong></div></div>{!connected ? <button className="primary-btn wide" onClick={connect}><Wallet size={17} /> Connect landlord wallet</button> : !createdId ? <button className="primary-btn wide" disabled={!isContractConfigured() || !title || !property || !tenant || !deposit || !/^[a-fA-F0-9]{64}$/.test(termsHash)} onClick={() => void createAndCapture()}>Create agreement on StudioNet</button> : <><p>{createHint}</p>{createTxHash && <a className="receipt-link" href={explorerTx(createTxHash)} target="_blank" rel="noreferrer">Creation transaction {createTxHash.slice(0, 12)}… <ArrowUpRight size={14} /></a>}<button className="secondary-btn wide" onClick={() => void addCurrentItem()} disabled={!items[items.length - 1].label || !items[items.length - 1].description || !isHttpsUrl(items[items.length - 1].baselineUrl) || !/^[a-fA-F0-9]{64}$/.test(items[items.length - 1].baselineHash)}>Register prepared item {items.length} here</button><button className="primary-btn wide" onClick={() => { setAgreementId(createdId); void refresh(createdId); setActive('case') }}>Continue registering inventory</button><a className="secondary-btn wide" href={`?agreement=${createdId}`}>Open agreement #{createdId}</a></>}</>}
    <div className="form-actions"><button className="secondary-btn" disabled={step === 1} onClick={() => setStep(s => Math.max(1, s - 1))}>Back</button>{step < 3 && <button className="primary-btn" disabled={step === 1 && (!title || !property || !tenant || !deposit || !/^[a-fA-F0-9]{64}$/.test(termsHash))} onClick={() => setStep(s => Math.min(3, s + 1))}>Continue <ChevronRight size={16} /></button>}</div>
    </div></div></section>
}
