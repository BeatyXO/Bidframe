# Bidframe

**Consensus security-deposit settlement on GenLayer StudioNet (chain ID 61999).**

Bidframe is a single Intelligent Contract plus a reviewer-facing web application for settling security deposits from sealed before/after evidence. A landlord defines the parties, deposit, inventory, move-in evidence hashes, and item-level deduction schedule before funds are locked. At checkout, GenLayer validators inspect the exact evidence bytes and return only a bounded condition classification. The contract converts that classification into a deterministic deduction and never lets the model invent a price, recipient, item, or payout.

> Current remediation milestone contract: [`0x9705Fa2dCc1A9b9CD545999F6a93bB4508dD997E`](https://explorer-studio.genlayer.com/address/0x9705Fa2dCc1A9b9CD545999F6a93bB4508dD997E), deployed to StudioNet 61999 with verified source parity. The production frontend is https://bidframe-seven.vercel.app/. The earlier submission contract [`0x3f5F81618cc86604f7094E525F46f37363CD99a7`](https://explorer-studio.genlayer.com/address/0x3f5F81618cc86604f7094E525F46f37363CD99a7) and Agreements #3/#4 remain historical pre-milestone evidence in `docs/SUBMISSION.md` and `docs/studionet-new-damage-lifecycle.json`.

## Remediation milestone

This milestone extends Bidframe from one-shot damage settlement into remediation-aware deposit settlement: after a positive `NEW_DAMAGE` charge, the tenant can make one bounded, immutable repair-evidence submission, and GenLayer checks whether the damage was restored. Deterministic contract logic then removes or preserves that item's original charged amount. The DRAFT cure policy is frozen at funding, and waiver/expiry preserve settlement liveness. The implementation and synthetic live lifecycle proof are complete. See [`docs/MILESTONE.md`](docs/MILESTONE.md) and [`docs/MILESTONE_LIVE_VERIFICATION.md`](docs/MILESTONE_LIVE_VERIFICATION.md).

> Remediation status: **complete**. Implementation, hostile review, CI, fresh StudioNet deployment/source parity, and the synthetic mixed-verdict Agreement #2 settlement are recorded in [`docs/MILESTONE_LIVE_VERIFICATION.md`](docs/MILESTONE_LIVE_VERIFICATION.md). Read-only production browser checks confirmed the live app's milestone contract and Agreement #2 fields; the owner reports completing final wallet-enabled browser verification. No separate browser-originated write hash was supplied, as disclosed in the milestone record.

## Why GenLayer

A normal smart contract can enforce deadlines and arithmetic but cannot reliably decide whether a wall has ordinary scuffing, a worktop has new damage, or an item is missing by comparing photographs. Bidframe puts only that semantic/visual question through consensus. Everything economically sensitive remains deterministic.

### Bounded verdict vocabulary

- `UNCHANGED` → 0 deduction
- `NORMAL_WEAR` → 0 deduction
- `NEW_DAMAGE` → severity `1`, `2`, or `3`, mapped to the frozen minor/moderate/severe schedule
- `MISSING` → frozen missing-item deduction
- `INCONCLUSIVE` → no automatic deduction; either party may resolve the item at zero deduction so the deposit cannot remain trapped

## Architecture

```text
DRAFT -> ACTIVE -> CHECKOUT -> ASSESSING -> READY -> SETTLED
  |         |          |            |          |         |
items     deposit    checkout     GenLayer   all items   exact
+ caps     locked     evidence    vision      resolved    transfers
```

There is exactly **one Python Intelligent Contract**: `contracts/Bidframe.py`.

Key safety properties:

1. Baseline URLs, SHA-256 hashes and deduction caps are frozen once the tenant funds the agreement.
2. The contract fetches baseline and checkout evidence independently and checks their SHA-256 before any LLM judgment.
3. Validators independently re-run the visual classification and compare only the consequential fields (`verdict` and `severity`), not prose reasoning.
4. Normal wear and unchanged condition always deduct zero.
5. Per-item deductions are deterministic and capped by the locked deposit.
6. `INCONCLUSIVE` fails closed and blocks automatic settlement.
7. Final transfers are emitted only after all items have resolved.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md).

## Network

Bidframe targets the **stable GenLayer StudioNet only** for this submission:

- chain ID: `61999`
- GenLayer RPC: `https://studio.genlayer.com/api`
- explorer: `https://explorer-studio.genlayer.com`

Do not substitute Studio development preview (`61997`) or Bradbury.

## Frontend

The Vite/React frontend keeps the purple + white design and uses live contract reads at the canonical StudioNet address. `VITE_CONTRACT_ADDRESS` can override the pinned canonical address for a future redeployment. The wallet path uses injected EIP-1193 providers only: explicit Connect requests accounts and switches/adds StudioNet 61999 when needed, while page-load hydration uses non-intrusive `eth_accounts` + `eth_chainId` to restore an already-authorized StudioNet session without opening a wallet prompt. The frontend does not request MetaMask Snaps. Submitted transaction hashes are persisted immediately, reconciled against StudioNet until a terminal finalized result, and kept in local Recent activity so an RPC wait timeout is not misreported as a failed transaction.

```bash
cd frontend
npm ci
cp ../.env.example .env
npm run dev
```

Production build:

```bash
npm run build
```

The UI is purple/white, responsive, and exposes:

- read an agreement by ID and load its registered items;
- create an agreement and register multiple items with HTTPS evidence, SHA-256, and frozen caps;
- fund the exact GEN deposit from the tenant wallet;
- open checkout and submit, challenge, propose, and accept evidence replacements;
- run consensus assessments and display bounded verdicts, severity, reasoning, and original versus effective deductions;
- configure a DRAFT-only cure period, submit one immutable tenant cure per eligible `NEW_DAMAGE` item, and assess, waive, or expire open cures;
- block READY while an item is incomplete, has an unresolved `INCONCLUSIVE`, or has an open cure; expose zero-deduction recovery for challenged or inconclusive evidence;
- mark ready, settle, and show final deduction/refund state;
- connect an injected EIP-1193 wallet to StudioNet 61999;
- restore already-authorized StudioNet wallet sessions without a popup, expose a copy/explorer/local-disconnect wallet menu, and automatically rebuild the write client after account/network changes when safe;
- persist submitted transaction hashes and local recent activity across reloads, keep timeouts in a non-terminal finalizing state, reconcile with StudioNet using conservative polling, and refresh loaded agreement state on finalization/focus/visibility changes;
- show transaction progress and link transactions/contracts to the Studio explorer.

## Contract workflow

1. Landlord calls `create_agreement(...)`, sets the cure period in DRAFT, and registers items with `add_item(...)`.
2. Tenant calls payable `fund_agreement(id)` with the exact GEN deposit, freezing the inventory and cure policy.
3. Either party opens checkout with `open_checkout(id)`. Checkout evidence may be challenged and replaced under the frozen evidence rules.
4. Either party calls `assess_item(...)`; GenLayer verifies evidence hashes and classifies the condition change. A positive charged `NEW_DAMAGE` result opens that item's bounded cure opportunity.
5. The tenant may submit one immutable cure evidence pair before the deadline. GenLayer returns `RESTORED`, `NOT_RESTORED`, or `INCONCLUSIVE`; waiver and expiry close unused or unresolved cure opportunities. `RESTORED` reduces only that item's effective deduction.
6. Once all original assessments are resolved and no cure remains open, `mark_ready(id)` freezes settlement totals.
7. Either party calls `settle(id)`; the contract emits deterministic GEN transfers from the effective deductions.

## Testing

The repository contains GenVM lint and Direct Mode tests in `tests/`:

```bash
python -m pip install genlayer-test genvm-linter
genvm-lint check contracts/Bidframe.py
gltest tests/ -v
```

The current remediation deployment and Agreement #2 lifecycle are documented in [`docs/MILESTONE_LIVE_VERIFICATION.md`](docs/MILESTONE_LIVE_VERIFICATION.md). [`docs/SUBMISSION.md`](docs/SUBMISSION.md) preserves the earlier submission deployment and Agreements #3/#4 as historical evidence.

## Deployment

The current remediation contract is `0x9705Fa2dCc1A9b9CD545999F6a93bB4508dD997E` on stable StudioNet 61999. To deploy a future validated revision:

```bash
genlayer network set studionet
genlayer network info
genlayer deploy --contract contracts/Bidframe.py
```

Record any future deployment address, transaction, exact source commit, source hash, and live lifecycle transactions in a new release record. The current remediation source and lifecycle proof are in `docs/MILESTONE_LIVE_VERIFICATION.md`. The historical submission Agreement #4 proves its own positive economic path, and its separate residual-balance observation remains disclosed in the submission evidence and threat model.

## License

MIT

