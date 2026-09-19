# Bidframe

**Consensus security-deposit settlement on GenLayer StudioNet (chain ID 61999).**

Bidframe is a single Intelligent Contract plus a reviewer-facing web application for settling security deposits from sealed before/after evidence. A landlord defines the parties, deposit, inventory, move-in evidence hashes, and item-level deduction schedule before funds are locked. At checkout, GenLayer validators inspect the exact evidence bytes and return only a bounded condition classification. The contract converts that classification into a deterministic deduction and never lets the model invent a price, recipient, item, or payout.

> Status: one contract is deployed to StudioNet 61999; local lint, Direct Mode tests, and frontend build pass. A full live lifecycle and GEN settlement proof remain outstanding.

## Why GenLayer

A normal smart contract can enforce deadlines and arithmetic but cannot reliably decide whether a wall has ordinary scuffing, a worktop has new damage, or an item is missing by comparing photographs. Bidframe puts only that semantic/visual question through consensus. Everything economically sensitive remains deterministic.

### Bounded verdict vocabulary

- `UNCHANGED` → 0 deduction
- `NORMAL_WEAR` → 0 deduction
- `NEW_DAMAGE` → severity `1`, `2`, or `3`, mapped to the frozen minor/moderate/severe schedule
- `MISSING` → frozen missing-item deduction
- `INCONCLUSIVE` → no automatic settlement; the item remains unresolved

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
- block READY while any item is incomplete or `INCONCLUSIVE`;
- mark ready, settle, and show final deduction/refund state;
- connect an injected EIP-1193 wallet to StudioNet 61999;
- show transaction progress and link transactions/contracts to the Studio explorer.

## Contract workflow

1. Landlord calls `create_agreement(...)`.
2. Landlord registers one or more items with `add_item(...)`.
3. Tenant calls payable `fund_agreement(id)` with the exact GEN deposit.
4. Either party opens checkout with `open_checkout(id)`.
5. Checkout evidence is submitted for each item with `submit_checkout_evidence(...)`; the counterparty may challenge before assessment, and replacement evidence needs acceptance from the other party.
6. Either party calls `assess_item(...)`; GenLayer validators verify hashes and classify visual change.
7. Once every item is resolved and none is `INCONCLUSIVE`, `mark_ready(id)` freezes settlement totals.
8. Either party calls `settle(id)`; the contract emits deterministic GEN transfers to the landlord and tenant.

## Testing

The repository contains GenVM lint and Direct Mode tests in `tests/`. On Windows, `tests/conftest.py` works around the installed Direct Mode runner's open stdin tempfile cleanup behavior without changing the contract execution path:

```bash
python -m pip install genlayer-test genvm-linter
genvm-lint check contracts/Bidframe.py
gltest tests/ -v
```

The contract deployment is finalized on StudioNet. Agreement lifecycle transactions, transfer receipts, and a measured fee profile remain outstanding until those operations can be performed and observed.

## Deployment

The contract is **not yet canonically deployed**. After local lint/tests pass:

```bash
genlayer network set studionet
genlayer network info
genlayer deploy --contract contracts/Bidframe.py
```

Record the final contract address, deploy transaction, exact source commit, source hash, and live lifecycle transactions in `docs/SUBMISSION.md`.

## License

MIT

