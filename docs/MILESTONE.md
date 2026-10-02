# Bidframe Remediation / Cure Verification Milestone

## Baselines

- Accepted submission baseline: **PENDING CONFIRMATION**. Repository evidence does not identify which exact commit was accepted as the submission.
- Pre-milestone repository baseline: `7d9b30268d0607b2e012d0be528d21c01101fdf7`.
- Substantive final submission-pass HEAD recorded in repository evidence: `af1225288e7c0b372d07c04633c62e4cb6e149c5`.
- `4d4e9bcb4312f1230dc478dbefe9bca07bddce32` and `7d9b30268d0607b2e012d0be528d21c01101fdf7` are documentation-only follow-ups after that submission-pass HEAD and remain in history.
- Milestone head: **IN PROGRESS**.
- Compare URL: `https://github.com/BeatyXO/Bidframe/compare/<ACCEPTED_BASELINE_SHA>...<FINAL_MILESTONE_SHA>` (accepted baseline pending confirmation).

## Before

At the pre-milestone baseline, Bidframe supports frozen move-in evidence and item deduction caps, sealed move-out evidence with challenge/replacement handling, GenLayer semantic damage classification, deterministic deductions, conservative inconclusive recovery, and deterministic deposit settlement. Those capabilities are the accepted product baseline and are not claimed as new milestone work.

## New in this milestone

This milestone adds one bounded tenant remediation attempt after a successful `NEW_DAMAGE` assessment: a DRAFT-only cure policy frozen at funding, an assessment-based deadline, immutable hash-bound cure evidence, a GenLayer `RESTORED` / `NOT_RESTORED` / `INCONCLUSIVE` decision, preserved original adjudication alongside an effective deduction, and waiver/expiry liveness. It also adds reviewer reads, frontend controls, adversarial tests, CI coverage, and (after local implementation and hostile review) a fresh Studionet deployment and live proof.

## Not milestone work

The existing agreement lifecycle, evidence challenge/replacement flow, original damage classifier, and settlement architecture predate this milestone.

## Evidence status

Deployment, source parity, live remediation lifecycle, frontend production update, and manual browser verification are pending. No existing deployment or transaction is milestone proof.
