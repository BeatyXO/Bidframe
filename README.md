# Bidframe

**Consensus security-deposit settlement on GenLayer StudioNet (chain ID 61999).**

Bidframe is a single Intelligent Contract plus a reviewer-facing web application for settling security deposits from sealed before/after evidence. A landlord defines the parties, deposit, inventory, move-in evidence hashes, and item-level deduction schedule before funds are locked. At checkout, GenLayer validators inspect the exact evidence bytes and return only a bounded condition classification. The contract converts that classification into a deterministic deduction and never lets the model invent a price, recipient, item, or payout.

> Status: the liveness-safe contract revision is implemented on `main` after audit fixes. The previous StudioNet deployment is superseded and must not be treated as canonical because it predates the recovery methods. The revised contract requires a fresh StudioNet 61999 deployment and live lifecycle proof.

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

The Vite/React frontend keeps the purple + white design and uses live contract reads at the canonical address by default; `VITE_CONTRACT_ADDRESS` can override it. Without a configured address it shows setup guidance and no fabricated sample case. Wallet writes target StudioNet 61999 and wait for finalized execution success before refreshing state.

```bash
cd frontend
npm install
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
- run consensus assessments and display bounded verdicts, severity, reasoning, and deterministic deductions;
- block READY while an item is incomplete or has an unresolved `INCONCLUSIVE`; expose zero-deduction recovery for challenged or inconclusive evidence;
- mark ready, settle, and show final deduction/refund state;
- connect an injected EIP-1193 wallet to StudioNet 61999;
- show transaction progress and link transactions/contracts to the Studio explorer.

## Contract workflow

1. Landlord calls `create_agreement(...)`.
2. Landlord registers one or more items with `add_item(...)`.
3. Tenant calls payable `fund_agreement(id)` with the exact GEN deposit.
4. Either party opens checkout with `open_checkout(id)`.
5. Checkout evidence is submitted for each item with `submit_checkout_evidence(...)`; the counterparty may challenge before assessment, and replacement evidence needs acceptance from the other party. A challenged item may also be conservatively resolved at zero deduction so a challenge cannot deadlock the deposit.
6. Either party calls `assess_item(...)`; GenLayer validators verify hashes and classify visual change. A finalized `INCONCLUSIVE` can be explicitly resolved at zero deduction.
7. Once every item is resolved and no unresolved `INCONCLUSIVE` remains, `mark_ready(id)` freezes settlement totals.
8. Either party calls `settle(id)`; the contract emits deterministic GEN transfers to the landlord and tenant.

## Testing

The repository contains GenVM lint and Direct Mode tests in `tests/`:

```bash
python -m pip install genlayer-test genvm-linter
genvm-lint check contracts/Bidframe.py
gltest tests/ -v
```

The earlier StudioNet deployment is retained only as historical evidence because it predates the liveness fixes. The revised source must be linted, tested, redeployed, and proven with a complete lifecycle before submission.

## Deployment

The revised contract is **not yet canonically deployed**. After lint/tests pass:

```bash
genlayer network set studionet
genlayer network info
genlayer deploy --contract contracts/Bidframe.py
```

Record the final contract address, deploy transaction, exact source commit, source hash, and live lifecycle transactions in `docs/SUBMISSION.md`.

## License

MIT

