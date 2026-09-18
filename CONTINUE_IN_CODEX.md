# Continue Bidframe in Codex

You are taking over the active GenLayer project in this repository:

- Repository: `BeatyXO/Bidframe`
- Product: **Bidframe — Consensus Security-Deposit Settlement**
- Target network: **stable GenLayer StudioNet, chain ID 61999 only**
- RPC: `https://studio.genlayer.com/api`
- Architecture constraint: **exactly one Python Intelligent Contract** (`contracts/Bidframe.py`)
- Frontend direction: keep and refine the existing **purple + white** visual system.
- Do **not** migrate this build to Bradbury or Studio development preview 61997.

The previous environment could push source to GitHub but could not reach npm/PyPI, so package-dependent validation and deployment were deliberately left unfinished. Do not assume the current contract is GenVM-clean merely because Python syntax compiles.

## Take ownership of the repository

Inspect the current HEAD first. Continue until every task that can be completed with the local machine and available wallet is finished. Do not stop after an audit or a single fix. Edit, test, commit and push the fixes.

## 1. Validate and finish the frontend first

From `frontend/`:

```bash
npm install
npm run typecheck
npm run build
```

Fix every TypeScript/Vite error. Use the current stable `genlayer-js` line that targets StudioNet 61999; do not switch to an RC that targets Studio-dev 61997.

Then finish the real contract integration. The frontend currently has a polished reviewer/demo UI and injected-wallet connection, but most case data is sample data. Replace/augment sample state with real contract reads/writes once the canonical contract is deployed.

Required product flows:

1. Connect injected EIP-1193 wallet to StudioNet.
2. Create agreement.
3. Add multiple inventory items with baseline HTTPS evidence URL + SHA-256 and four frozen deduction caps.
4. Tenant funds the exact GEN deposit.
5. Open checkout.
6. Submit move-out evidence.
7. Challenge submitted evidence before assessment.
8. Propose and counterparty-accept replacement evidence.
9. Trigger `assess_item` and show pending/finalized/failed transaction state correctly.
10. Render consensus verdict, severity, reasoning and deterministic deduction for every item.
11. Block READY while an item is INCONCLUSIVE or incomplete.
12. Mark ready.
13. Settle and show landlord deduction + tenant refund.
14. Link every canonical transaction/address to the Studio explorer.

Do not show a transaction as successful just because it was submitted; wait for GenLayer finalization and check execution state.

## 2. Audit the single contract against current GenLayer APIs

Install the current stable StudioNet-compatible GenLayer tooling and run the real linter/test stack. At minimum:

```bash
python -m pip install genvm-linter genlayer-test
genvm-lint check contracts/Bidframe.py
gltest tests/ -v
```

If the actual current commands/package names differ, consult current official GenLayer docs and use their current stable equivalents. Do not weaken tests to make them pass.

Pay special attention to these unverified areas from the handoff:

- `TreeMap.get(...)` usage and defaults, especially `Address` defaults.
- Whether `hashlib.sha256` is supported exactly as used in current GenVM.
- `gl.message_raw["datetime"]` compatibility.
- dict return values from public view methods.
- `gl.nondet.web.get(...).status_code` and response body byte handling.
- `gl.nondet.exec_prompt(..., images=[before, after], response_format="json")` exact current signature.
- `gl.vm.run_nondet_unsafe` return/validator semantics and `gl.vm.Return.calldata` shape.
- native GEN transfers through the EVM contract interface and `.emit_transfer(value=...)`.
- payable `gl.message.value` semantics and direct/local tests for exact funding.
- any mutable-state patterns that Direct Mode allows but StudioNet rejects.

Preserve the core security invariant: **validators may classify physical condition only; they must never invent money, recipients, inventory items or settlement rules.**

## 3. Expand Direct Mode and negative testing

The final suite should cover, not merely document:

- valid DRAFT creation;
- invalid tenant/address/amount inputs;
- only landlord can add inventory;
- tenant-only funding;
- exact payable amount required;
- no funding without inventory;
- inventory immutable after funding;
- move-out evidence write-once;
- challenge only by counterparty;
- replacement cannot activate without counterparty acceptance;
- baseline hash mismatch;
- checkout hash mismatch;
- unavailable evidence URL;
- prompt/result outside verdict vocabulary;
- NEW_DAMAGE severity 1/2/3 mappings;
- non-damage severity forced to zero;
- NORMAL_WEAR always deducts zero;
- UNCHANGED always deducts zero;
- MISSING fixed deduction;
- INCONCLUSIVE blocks READY;
- validator disagreement fails closed;
- unauthorized assessment/state changes;
- total deductions capped at deposit;
- deterministic refund math;
- no double assessment;
- no double settlement;
- settlement transfers go only to the frozen landlord and tenant;
- state/readback invariants after each lifecycle phase.

Do not mutate contract storage directly in tests if the current Direct Mode has a supported way to exercise the real transition.

## 4. Produce a real StudioNet 61999 lifecycle proof

Only after lint, Direct Mode and frontend build are green, deploy the exact committed source to **StudioNet 61999** with the funded wallet available on this machine.

Create a real canonical lifecycle with at least two inventory items and public, stable image evidence:

- one `UNCHANGED` or `NORMAL_WEAR` result;
- one `NEW_DAMAGE` result;
- one separate negative/ambiguous case proving `INCONCLUSIVE` blocks automatic settlement if practical.

Verify finality and readback after every transaction. Confirm native GEN settlement balances/transfer behavior rather than assuming it.

Record in `docs/SUBMISSION.md`:

- canonical contract address;
- deployment transaction;
- FINALIZED/SUCCESS proof;
- exact deployed commit SHA;
- SHA-256 of `contracts/Bidframe.py`;
- create-agreement tx;
- inventory txs;
- funding tx;
- checkout/evidence txs;
- assessment txs and readback;
- mark-ready tx;
- settlement tx;
- final state and payment proof;
- negative test proof;
- fee observations where useful.

Never invent or shorten transaction IDs in the canonical evidence section.

## 5. Submission-quality hardening

Before declaring done:

- compare the project against high-quality GenLayer submissions for architecture quality, not for copied subject matter;
- preserve the one-contract architecture;
- confirm all README network information says StudioNet 61999;
- remove stale demo copy that could mislead reviewers once live data exists;
- keep `INCONCLUSIVE` fail-closed;
- keep evidence SHA-256 binding;
- ensure the reasoning string is non-consequential and consensus equivalence depends on verdict + severity only;
- add any missing architecture diagrams/docs that materially help a reviewer;
- add source/deployment parity verification;
- run `python scripts/verify_submission.py` and record the final hash;
- run the complete frontend production build;
- run all contract tests and lint one final time on the exact deployment commit;
- commit and push everything to `main`.

If Vercel credentials/CLI are available, deploy the frontend and wire `VITE_CONTRACT_ADDRESS` to the canonical StudioNet address. If deployment credentials are unavailable, leave a precise ready-to-deploy configuration rather than fabricating a live URL.

## Definition of done

Do not report Bidframe submission-ready until all of these are true:

- one contract only;
- current GenVM lint passes;
- Direct Mode suite passes;
- frontend installs, typechecks and production-builds;
- canonical StudioNet 61999 deployment exists;
- source commit/hash matches deployment;
- full live lifecycle is finalized and read back;
- native GEN settlement is proven;
- explorer evidence is documented;
- frontend uses the canonical address and real reads/writes;
- docs are accurate and contain no TBD claims presented as completed facts;
- final HEAD is pushed to `BeatyXO/Bidframe`.

Start by pulling/inspecting the latest HEAD, then execute the work rather than returning only recommendations.
