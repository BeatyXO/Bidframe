# Remediation Milestone Security Review

## Scope and status

This is the implementation-stage hostile review for the Remediation / Cure Verification milestone. The review is being run against the source diff from pre-milestone repository baseline `7d9b30268d0607b2e012d0be528d21c01101fdf7`. Deployment is not approved by this document. A green hosted CI run and fresh-chain verification remain deployment gates.

## Findings addressed

- **Deposit cap and item isolation:** A scheduled deduction larger than the remaining deposit is recorded as `assessed_deduction_wei`, while `original_deduction_wei` records only the positive amount actually allocated to that item. `effective_deduction_wei` starts equal to that charged amount. Cure is eligible only for a positive original charged amount. A cure releases only its own effective amount. Direct Mode tests cover capped items, restoration isolation, and mixed restored / not-restored settlement.
- **Repeated or unauthorized cure writes:** Evidence submission is tenant-only, HTTPS and 64-hex SHA-256 validated, allowed only from `ELIGIBLE`, and makes the state `SUBMITTED`. Subsequent submission and waiver are rejected. Contract tests cover landlord impersonation and duplicate submission.
- **Evidence substitution:** The cure assessor fetches and hashes the sealed baseline, checkout, and cure bytes before the prompt. Hash mismatch reverts without changing cure state. The prompt treats image text as evidence, not instructions, and asks only for the bounded restoration verdict.
- **Consensus surface:** Validators compare only the cure verdict. Reasoning is stored for audit but is not consensus-critical.
- **Economic adjustment:** Only `RESTORED` subtracts the item's current effective amount. `NOT_RESTORED` and `INCONCLUSIVE` preserve it. The original `NEW_DAMAGE` verdict and severity are not rewritten. An invariant guard rejects a total smaller than the item amount before subtraction. Tests verify restoration, preservation, and settlement arithmetic.
- **Deadline and settlement liveness:** Submission and cure assessment are unavailable at or after the deadline. Permissionless expiry handles both `ELIGIBLE` and `SUBMITTED`; tenant waiver is available before the deadline only. `mark_ready` requires all inventory assessed, no unresolved original inconclusive item, and zero active cures. Tests cover early/late expiry, waiver, readiness gates, and settlement.
- **Storage and loops:** Cure evidence and results are held in fixed per-item maps; new cure paths do not introduce unbounded iteration or append-only arrays.
- **Frontend stale receipt state:** Submitted transactions remain pending until finalized; the existing transaction classifier is now unit-tested for pending, successful, and failed finalized receipts. Successful cure actions refresh the loaded agreement state.

## Checks run

- Direct Mode: `python -m pytest tests/test_bidframe.py -v --tb=short` — 28 passed.
- Fast GenVM AST checks: `genvm-lint lint contracts/Bidframe.py` — 3 checks passed.
- GenVM full check with the contract-compatible runtime selected explicitly: `GENVM_VERSION=v0.2.16 genvm-lint check contracts/Bidframe.py` — 3 AST checks and SDK validation pass; schema exposes 21 methods (3 views, 18 writes).
- Frontend tests: `npm test` — 7 passed; typecheck and production build pass locally. The production build reports the existing large JavaScript chunk warning.

## Remaining review gates

- Obtain a green GitHub Actions run with CI pinned to the contract-compatible GenVM runtime.
- Recheck source after any validation-driven change.
- Before deployment, verify a fresh contract, deployed source parity, and the complete lifecycle against the new contract only.
- The historical contract and Vercel frontend are pre-milestone and are not evidence for this capability.
