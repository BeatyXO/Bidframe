import { useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  ChevronRight,
  CircleDollarSign,
  FileCheck2,
  Fingerprint,
  Gauge,
  Image as ImageIcon,
  LockKeyhole,
  Menu,
  Scale,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react'
import { StatusPill } from './components/StatusPill'
import { CHAIN_ID, CONTRACT_ADDRESS, connectWallet, explorerAddress, isContractConfigured } from './lib/genlayer'
import type { AgreementSummary, SettlementItem, Verdict } from './types'

const GEN = 10n ** 18n

const agreement: AgreementSummary = {
  id: 1,
  title: 'Atlas Lofts · Unit 4B',
  propertyRef: 'LAG-ATL-4B-0926',
  status: 'ASSESSING',
  depositWei: 35n * GEN / 10n,
  landlord: '0x4d2A…8C31',
  tenant: '0x91Fe…20B7',
  assessed: 3,
  itemCount: 5,
  deductionWei: 55n * GEN / 100n,
  unresolved: 1,
}

const items: SettlementItem[] = [
  { id: 1, name: 'Living room wall', description: 'White emulsion wall, north elevation', status: 'Assessed', verdict: 'NORMAL_WEAR', severity: 0, deductionWei: 0n, baselineHash: 'b4f8…92d1', checkoutHash: '0fa1…37c0' },
  { id: 2, name: 'Kitchen worktop', description: 'Quartz surface beside sink', status: 'Assessed', verdict: 'NEW_DAMAGE', severity: 2, deductionWei: 55n * GEN / 100n, baselineHash: '18cc…e902', checkoutHash: '992a…c8f4' },
  { id: 3, name: 'Bedroom wardrobe', description: 'Built-in two-door wardrobe', status: 'Assessed', verdict: 'UNCHANGED', severity: 0, deductionWei: 0n, baselineHash: '6c2d…64ba', checkoutHash: '10aa…a0d1' },
  { id: 4, name: 'Dining chair #4', description: 'Upholstered walnut dining chair', status: 'Ready', baselineHash: '8de1…842f', checkoutHash: 'cea7…b990' },
  { id: 5, name: 'Entryway mirror', description: 'Full-length framed mirror', status: 'Awaiting evidence', baselineHash: '770c…f261' },
]

function gen(wei: bigint) {
  return `${(Number(wei) / Number(GEN)).toFixed(2)} GEN`
}

function verdictTone(v?: Verdict): 'purple' | 'green' | 'amber' | 'slate' | 'red' {
  if (v === 'UNCHANGED') return 'green'
  if (v === 'NORMAL_WEAR') return 'slate'
  if (v === 'NEW_DAMAGE') return 'amber'
  if (v === 'MISSING') return 'red'
  return 'purple'
}

export default function App() {
  const [wallet, setWallet] = useState('')
  const [walletError, setWalletError] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [active, setActive] = useState<'overview' | 'case' | 'create'>('overview')
  const configured = isContractConfigured()

  const progress = useMemo(() => Math.round((agreement.assessed / agreement.itemCount) * 100), [])

  async function handleConnect() {
    try {
      setWalletError('')
      const result = await connectWallet()
      setWallet(result.address)
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Wallet connection failed')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setActive('overview')} aria-label="Bidframe home">
          <span className="brand-mark"><Scale size={18} /></span>
          <span>Bidframe</span>
        </button>
        <nav className="desktop-nav">
          <button className={active === 'overview' ? 'nav-active' : ''} onClick={() => setActive('overview')}>Overview</button>
          <button className={active === 'case' ? 'nav-active' : ''} onClick={() => setActive('case')}>Settlement case</button>
          <button className={active === 'create' ? 'nav-active' : ''} onClick={() => setActive('create')}>New agreement</button>
        </nav>
        <div className="top-actions">
          <span className="network-chip"><span className="network-dot" /> StudioNet · {CHAIN_ID}</span>
          <button className="wallet-btn" onClick={handleConnect}><Wallet size={16} />{wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : 'Connect wallet'}</button>
          <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      {mobileOpen && <div className="mobile-menu">
        <button onClick={() => { setActive('overview'); setMobileOpen(false) }}>Overview</button>
        <button onClick={() => { setActive('case'); setMobileOpen(false) }}>Settlement case</button>
        <button onClick={() => { setActive('create'); setMobileOpen(false) }}>New agreement</button>
      </div>}

      {walletError && <div className="toast error-toast">{walletError}</div>}
      {!configured && <div className="demo-banner"><Sparkles size={15} /> Interface is in reviewer/demo mode until <code>VITE_CONTRACT_ADDRESS</code> is set after deployment.</div>}

      <main>
        {active === 'overview' && <Overview onOpen={() => setActive('case')} progress={progress} configured={configured} />}
        {active === 'case' && <CaseView progress={progress} />}
        {active === 'create' && <CreateView connected={Boolean(wallet)} onConnect={handleConnect} />}
      </main>

      <footer>
        <div className="footer-brand"><span className="brand-mark mini"><Scale size={14} /></span> Bidframe</div>
        <p>Evidence-bound security-deposit settlement. One Intelligent Contract. StudioNet 61999.</p>
        <div className="footer-links">
          {configured && <a href={explorerAddress(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer">Contract <ArrowUpRight size={13} /></a>}
          <a href="https://studio.genlayer.com" target="_blank" rel="noreferrer">GenLayer Studio <ArrowUpRight size={13} /></a>
        </div>
      </footer>
    </div>
  )
}

function Overview({ onOpen, progress, configured }: { onOpen: () => void; progress: number; configured: boolean }) {
  return <>
    <section className="hero page-width">
      <div className="hero-copy">
        <StatusPill>Consensus security-deposit settlement</StatusPill>
        <h1>Physical condition,<br /><span>settled by evidence.</span></h1>
        <p>Bidframe binds move-in evidence, deduction caps and deposit funds before checkout. GenLayer validators classify the condition change; deterministic contract logic calculates the money.</p>
        <div className="hero-actions">
          <button className="primary-btn" onClick={onOpen}>Open live case <ChevronRight size={17} /></button>
          <a className="text-link" href="https://docs.genlayer.com/developers/intelligent-contracts/features/image-processing" target="_blank" rel="noreferrer">How consensus sees evidence <ArrowUpRight size={14} /></a>
        </div>
      </div>
      <div className="hero-panel">
        <div className="hero-panel-top">
          <div><span className="eyebrow">CASE #001</span><h3>{agreement.title}</h3></div>
          <StatusPill tone="purple">Assessing</StatusPill>
        </div>
        <div className="lock-visual"><LockKeyhole size={29} /><div><strong>{gen(agreement.depositWei)}</strong><span>deposit locked in contract</span></div></div>
        <div className="progress-head"><span>Evidence assessment</span><strong>{agreement.assessed}/{agreement.itemCount}</strong></div>
        <div className="progress"><i style={{ width: `${progress}%` }} /></div>
        <div className="mini-grid">
          <div><span>Current deduction</span><strong>{gen(agreement.deductionWei)}</strong></div>
          <div><span>Unresolved</span><strong>{agreement.unresolved} item</strong></div>
        </div>
        <button className="panel-link" onClick={onOpen}>Review evidence matrix <ArrowUpRight size={15} /></button>
      </div>
    </section>

    <section className="page-width proof-strip">
      <div><ShieldCheck /><span><b>Frozen inputs</b>Evidence hashes cannot change after funding.</span></div>
      <div><ImageIcon /><span><b>Vision consensus</b>Validators independently inspect before/after images.</span></div>
      <div><Gauge /><span><b>Bounded verdicts</b>The model cannot invent prices or recipients.</span></div>
      <div><CircleDollarSign /><span><b>Deterministic payout</b>Frozen caps turn verdicts into exact deductions.</span></div>
    </section>

    <section className="page-width section-block">
      <div className="section-heading"><div><span className="eyebrow">WHY BIDFRAME</span><h2>Judgment where code stops.<br />Code where judgment should stop.</h2></div><p>The contract gives AI one narrow job: describe the condition change inside a closed vocabulary. Everything economically sensitive remains deterministic.</p></div>
      <div className="three-cards">
        <article className="feature-card"><span className="icon-box"><Fingerprint /></span><h3>Evidence-bound</h3><p>Baseline and checkout media are pinned by SHA-256. Validators reject fetched bytes that do not match the sealed evidence.</p><span className="card-num">01</span></article>
        <article className="feature-card"><span className="icon-box"><Scale /></span><h3>Consensus-classified</h3><p>UNCHANGED, NORMAL_WEAR, NEW_DAMAGE, MISSING or INCONCLUSIVE—plus a bounded severity bucket for new damage.</p><span className="card-num">02</span></article>
        <article className="feature-card"><span className="icon-box"><FileCheck2 /></span><h3>Settlement-safe</h3><p>Normal wear is always zero. Damage deductions come only from the pre-agreed item schedule and can never exceed the locked deposit.</p><span className="card-num">03</span></article>
      </div>
    </section>

    <section className="page-width architecture-card">
      <div><span className="eyebrow light">SINGLE-CONTRACT ARCHITECTURE</span><h2>One state machine from deposit to settlement.</h2><p>No Bradbury dependency. No second vault contract. Bidframe holds the GEN deposit, stores immutable settlement terms, records evidence and releases the final amounts.</p></div>
      <div className="state-flow"><span>DRAFT</span><i>→</i><span>ACTIVE</span><i>→</i><span>CHECKOUT</span><i>→</i><span>ASSESSING</span><i>→</i><span>READY</span><i>→</i><span>SETTLED</span></div>
      <div className="arch-foot"><span><BadgeCheck size={16} /> Stable StudioNet</span><b>Chain ID 61999</b><span className={configured ? 'configured' : ''}>{configured ? 'Contract configured' : 'Awaiting deployment'}</span></div>
    </section>
  </>
}

function CaseView({ progress }: { progress: number }) {
  return <section className="page-width case-page">
    <div className="case-title-row">
      <div><button className="back-link">Settlement / Case #{agreement.id.toString().padStart(3, '0')}</button><h1>{agreement.title}</h1><p>{agreement.propertyRef} · landlord {agreement.landlord} · tenant {agreement.tenant}</p></div>
      <div className="case-title-actions"><StatusPill>ASSESSING</StatusPill><button className="secondary-btn">Copy case link</button></div>
    </div>

    <div className="metric-grid">
      <Metric icon={<LockKeyhole />} label="Deposit locked" value={gen(agreement.depositWei)} sub="100% funded" />
      <Metric icon={<Scale />} label="Current deduction" value={gen(agreement.deductionWei)} sub="bounded by frozen schedule" />
      <Metric icon={<BadgeCheck />} label="Assessed" value={`${agreement.assessed}/${agreement.itemCount}`} sub={`${progress}% complete`} />
      <Metric icon={<ShieldCheck />} label="Unresolved" value={`${agreement.unresolved}`} sub="fails closed" />
    </div>

    <div className="case-grid">
      <div className="evidence-card">
        <div className="card-head"><div><span className="eyebrow">EVIDENCE MATRIX</span><h2>Registered inventory</h2></div><span className="hash-chip">Terms 6b92…107e</span></div>
        <div className="table-wrap"><table><thead><tr><th>Item</th><th>Evidence</th><th>Consensus</th><th>Deduction</th></tr></thead><tbody>
          {items.map(item => <tr key={item.id}>
            <td><strong>{item.name}</strong><span>{item.description}</span></td>
            <td><span className="evidence-line"><Fingerprint size={13} /> in {item.baselineHash}</span><span className="evidence-line muted"><Fingerprint size={13} /> out {item.checkoutHash || 'not submitted'}</span></td>
            <td>{item.verdict ? <StatusPill tone={verdictTone(item.verdict)}>{item.verdict.replace('_', ' ')}</StatusPill> : <StatusPill tone={item.status === 'Ready' ? 'purple' : 'slate'}>{item.status}</StatusPill>}</td>
            <td><strong>{item.deductionWei !== undefined ? gen(item.deductionWei) : '—'}</strong>{item.severity ? <span>severity {item.severity}/3</span> : null}</td>
          </tr>)}
        </tbody></table></div>
      </div>
      <aside className="settlement-card">
        <span className="eyebrow">PROJECTED SETTLEMENT</span><h3>{gen(agreement.depositWei - agreement.deductionWei)}</h3><p>currently refundable to tenant</p>
        <div className="settlement-bar"><i style={{ width: '84%' }} /></div>
        <dl><div><dt>Deposit</dt><dd>{gen(agreement.depositWei)}</dd></div><div><dt>Deductions</dt><dd>− {gen(agreement.deductionWei)}</dd></div><div className="total"><dt>Refund</dt><dd>{gen(agreement.depositWei - agreement.deductionWei)}</dd></div></dl>
        <div className="notice"><ShieldCheck size={17} /><p><b>Settlement is still locked.</b> Every inventory item must resolve before the contract can release funds.</p></div>
        <button className="primary-btn wide" disabled>Settle after consensus</button>
      </aside>
    </div>
  </section>
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return <div className="metric"><span className="metric-icon">{icon}</span><div><p>{label}</p><strong>{value}</strong><span>{sub}</span></div></div>
}

function CreateView({ connected, onConnect }: { connected: boolean; onConnect: () => void }) {
  const [step, setStep] = useState(1)
  return <section className="page-width create-page">
    <div className="create-intro"><StatusPill>Create agreement</StatusPill><h1>Freeze the rules before<br />the deposit moves.</h1><p>A Bidframe agreement is intentionally difficult to mutate after funding. Register the parties, deposit, evidence policy and item-specific deduction caps first.</p></div>
    <div className="create-layout">
      <ol className="steps">
        {['Agreement', 'Inventory', 'Review & fund'].map((label, i) => <li key={label} className={step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}><span>{step > i + 1 ? '✓' : i + 1}</span><div><b>{label}</b><small>{i === 0 ? 'Parties & deposit' : i === 1 ? 'Evidence & caps' : 'Seal immutable terms'}</small></div></li>)}
      </ol>
      <div className="form-card">
        {step === 1 && <>
          <div className="form-head"><div><span className="eyebrow">STEP 01</span><h2>Agreement details</h2></div><Building2 /></div>
          <label>Agreement title<input defaultValue="Atlas Lofts · Unit 4B" /></label>
          <div className="two-col"><label>Property reference<input defaultValue="LAG-ATL-4B-0926" /></label><label>Deposit (GEN)<input type="number" defaultValue="3.5" step="0.1" /></label></div>
          <label>Tenant wallet<input placeholder="0x…" /></label>
          <label>Terms hash<input placeholder="SHA-256 of signed lease / deposit schedule" /></label>
          <div className="form-note"><LockKeyhole size={16} />Terms, parties and deposit value become immutable once funded.</div>
        </>}
        {step === 2 && <>
          <div className="form-head"><div><span className="eyebrow">STEP 02</span><h2>Register inventory</h2></div><ImageIcon /></div>
          <label>Item label<input defaultValue="Kitchen worktop" /></label>
          <label>Baseline evidence URL<input placeholder="https://…/move-in.jpg" /></label>
          <label>Baseline SHA-256<input placeholder="64 hex characters" /></label>
          <div className="four-col"><label>Minor<input type="number" placeholder="GEN" /></label><label>Moderate<input type="number" placeholder="GEN" /></label><label>Severe<input type="number" placeholder="GEN" /></label><label>Missing<input type="number" placeholder="GEN" /></label></div>
          <div className="form-note"><ShieldCheck size={16} />Normal wear and unchanged condition always deduct zero, regardless of the schedule.</div>
        </>}
        {step === 3 && <>
          <div className="form-head"><div><span className="eyebrow">STEP 03</span><h2>Review & seal</h2></div><FileCheck2 /></div>
          <div className="review-box"><div><span>Deposit</span><strong>3.50 GEN</strong></div><div><span>Inventory</span><strong>5 items</strong></div><div><span>Network</span><strong>StudioNet · 61999</strong></div><div><span>Contract</span><strong>Single IC</strong></div></div>
          <div className="hash-preview"><Fingerprint size={17} /><div><span>Definition hash preview</span><code>6b92d39d1b07…b743107e</code></div></div>
          {!connected ? <button className="primary-btn wide" onClick={onConnect}><Wallet size={17} /> Connect wallet to continue</button> : <button className="primary-btn wide" disabled={!isContractConfigured()}>{isContractConfigured() ? 'Create on StudioNet' : 'Deploy contract before writing'}</button>}
        </>}
        <div className="form-actions"><button className="secondary-btn" disabled={step === 1} onClick={() => setStep(s => Math.max(1, s - 1))}>Back</button>{step < 3 && <button className="primary-btn" onClick={() => setStep(s => Math.min(3, s + 1))}>Continue <ChevronRight size={16} /></button>}</div>
      </div>
    </div>
  </section>
}
