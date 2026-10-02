# Remediation Milestone Security Review

## Scope and status

This hostile review covers the Remediation / Cure Verification source diff from pre-milestone repository baseline `7d9b30268d0607b2e012d0be528d21c01101fdf7`. The corrected source uses a two-image cure prompt and has passed local contract, frontend, and build gates. Hosted CI, a replacement fresh deployment, and live verification of the two-image path remain required before this review is final.

## Findings addressed

- **Deposit cap and item isolation:** A scheduled deduction larger than the remaining deposit is recorded as `assessed_deduction_wei`, while `original_deduction_wei` records only the positive amount actually allocated to that item. `effective_deduction_wei` starts equal to that charged amount. Cure is eligible only for a positive original charged amount. A cure releases only its own effective amount. Direct Mode tests cover capped items, restoration isolation, and mixed restored / not-restored settlement.
- **Repeated or unauthorized cure writes:** Evidence submission is tenant-only, HTTPS and 64-hex SHA-256 validated, allowed only from `ELIGIBLE`, and makes the state `SUBMITTED`. Subsequent submission and waiver are rejected. Contract tests cover landlord impersonation and duplicate submission.
- **Evidence substitution and runtime image limit:** The cure assessor fetches and hashes the sealed baseline, checkout, and cure bytes before the prompt. Hash mismatch reverts without changing cure state. The prompt sends only baseline and cure images; the already-finalized `NEW_DAMAGE` result and JSON-escaped frozen item label/description identify the target. Image text and metadata are treated as untrusted data, never instructions. This two-image input respects GenLayer's documented maximum of two images. On the first fresh deployment, a three-image cure prompt failed at `exec_prompt` with `SystemError: 2: inval`; that deployment is excluded from milestone proof and the corrected source requires a new live verification.
- **Consensus surface:** Validators compare only the cure verdict. Reasoning is stored for audit but is not consensus-critical.
- **Economic adjustment:** Only `RESTORED` subtracts the item's current effective amount. `NOT_RESTORED` and `INCONCLUSIVE` preserve it. The original `NEW_DAMAGE` verdict and severity are not rewritten. An invariant guard rejects a total smaller than the item amount before subtraction. Tests verify restoration, preservation, and settlement arithmetic.
- **Deadline and settlement liveness:** Submission and cure assessment are unavailable at or after the deadline. Permissionless expiry handles both `ELIGIBLE` and `SUBMITTED`; tenant waiver is available before the deadline only. `mark_ready` requires all inventory assessed, no unresolved original inconclusive item, and zero active cures. Tests cover early/late expiry, waiver, readiness gates, and settlement.
- **Storage and loops:** Cure evidence and results are held in fixed per-item maps; new cure paths do not introduce unbounded iteration or append-only arrays.
- **Frontend stale receipt state:** Submitted transactions remain pending until finalized; the existing transaction classifier is now unit-tested for pending, successful, and failed finalized receipts. Successful cure actions refresh the loaded agreement state.

## Current local gates

- Direct Mode: `python -m pytest tests/test_bidframe.py -v --tb=short` — 30 passed, including a regression check that the cure prompt stays within the two-image runtime limit.
- GenVM: `GENVM_VERSION=v0.2.16 genvm-lint check contracts/Bidframe.py` — 3 lint checks, SDK validation, and 21-method schema passed; `genvm-lint typecheck` reports no errors.
- Frontend: `npm test -- --configLoader runner` — 7 passed; typecheck and production build pass. Build reports the existing >500 kB JavaScript chunk warning.
- Prior hosted run [37034287542](https://github.com/BeatyXO/Bidframe/actions/runs/37034287542) passed both jobs before the two-image correction. CI for the corrected source remains pending.

## Runtime investigation and remaining review gates

- GenLayer's official [validator configuration](https://docs.genlayer.com/validators/genvm-configuration) documents text plus up to two images. The [image processing guide](https://docs.genlayer.com/developers/intelligent-contracts/features/image-processing) accepts a sequence of image bytes.
- First deployment excluded from proof: contract `0xd5F5E42D46AFa23903dd479e19667029f77247e4`, deployment transaction `0xe19111080a5c325c954708d312afb41ab47dc72f4001c723b6b322ce627b6b2a`. Cure transaction `0x219c96ae0c759da5cc9f955e90a869c0a8ff2e482854e5ef212eb806675d0862` finalized `MAJORITY_DISAGREE`; its leader trace returned `SystemError: 2: inval` at the three-image `exec_prompt` call. An earlier `mark_ready` negative guard transaction `0x27aa4d694cbc089c788bb855ee0280803adeeec8b5ecda04868407c8d3fec0be` correctly finalized as `ERROR / rollback` while cures were open. Agreement #1's exact 1 GEN deposit is being recovered through the frozen deadline and permissionless expiry; it is not milestone proof.
- Re-run hosted CI after the two-image correction.
- Deploy a replacement fresh contract, verify deployed source parity, and complete the lifecycle against that new contract only.
- The historical contract and Vercel frontend are pre-milestone and are not evidence for this capability.
