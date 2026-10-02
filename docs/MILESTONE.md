# Bidframe Remediation / Cure Verification Milestone

## Baselines

- Accepted submission baseline: **PENDING CONFIRMATION**. Repository evidence does not identify which exact commit was accepted as the submission.
- Pre-milestone repository baseline: `7d9b30268d0607b2e012d0be528d21c01101fdf7`.
- Substantive final submission-pass HEAD recorded in repository evidence: `af1225288e7c0b372d07c04633c62e4cb6e149c5`.
- `4d4e9bcb4312f1230dc478dbefe9bca07bddce32` and `7d9b30268d0607b2e012d0be528d21c01101fdf7` are documentation-only follow-ups after that submission-pass HEAD and remain in history.
- Milestone head: **IN PROGRESS**.
- Compare URL: `https://github.com/BeatyXO/Bidframe/compare/<ACCEPTED_BASELINE_SHA>...<FINAL_MILESTONE_SHA>` (accepted baseline pending confirmation).

## Before

At the pre-milestone repository baseline, Bidframe supports frozen move-in evidence and item deduction caps, sealed move-out evidence with challenge/replacement handling, GenLayer semantic damage classification, deterministic deductions, conservative inconclusive recovery, and deterministic deposit settlement. These are existing capabilities, not new milestone work. This statement does not establish which commit was accepted as the submission baseline.

## New in this milestone

This milestone adds one bounded tenant remediation attempt after a successful `NEW_DAMAGE` assessment: a DRAFT-only cure policy frozen at funding, an assessment-based deadline, immutable hash-bound cure evidence, a GenLayer `RESTORED` / `NOT_RESTORED` / `INCONCLUSIVE` decision, preserved original adjudication alongside an effective deduction, and waiver/expiry liveness. If scheduled item amounts exceed the deposit, the original charged amount is allocated in assessment order up to the remaining deposit; the uncapped severity-mapped amount remains separately available for audit. Cure eligibility requires a positive original charged amount, and restoring an item releases only that item's amount. It also adds reviewer reads, frontend controls, adversarial tests, CI coverage, and (after local implementation and hostile review) a fresh Studionet deployment and live proof.

## Not milestone work

The existing agreement lifecycle, evidence challenge/replacement flow, original damage classifier, and settlement architecture predate this milestone.

## Evidence status

The corrected two-image cure prompt passes 30 local Direct Mode tests, GenVM SDK validation/typecheck with `v0.2.16`, 7 frontend tests, frontend typecheck, and production build. GitHub Actions run [37034287542](https://github.com/BeatyXO/Bidframe/actions/runs/37034287542) passed the earlier implementation; hosted CI must run again for the two-image correction. The hostile review and runtime investigation are recorded in `docs/MILESTONE_SECURITY_REVIEW.md`.

The first milestone deployment (`0xd5F5E42D46AFa23903dd479e19667029f77247e4`) exposed GenVM's two-image prompt limit and is explicitly excluded from proof. Its one funded diagnostic agreement is being recovered by waiting for its frozen cure deadline and permissionless expiry. A replacement fresh deployment, its source parity, the successful live cure lifecycle, Vercel production update, and manual browser verification remain pending. No historical or failed deployment counts as milestone proof.
