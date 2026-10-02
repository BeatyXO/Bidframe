# Bidframe Remediation / Cure Verification Milestone

## Baselines

- Accepted submission baseline: **PENDING CONFIRMATION**. Repository evidence does not identify which exact commit was accepted as the submission.
- Pre-milestone repository baseline: `7d9b30268d0607b2e012d0be528d21c01101fdf7`.
- Substantive final submission-pass HEAD recorded in repository evidence: `af1225288e7c0b372d07c04633c62e4cb6e149c5`.
- `4d4e9bcb4312f1230dc478dbefe9bca07bddce32` and `7d9b30268d0607b2e012d0be528d21c01101fdf7` are documentation-only follow-ups after that submission-pass HEAD and remain in history.
- Milestone head: **IN PROGRESS**; the owner-reported Vercel redeployment and read-only Agreement #2 rendering have been verified, while injected-wallet/network/write receipt checks remain outstanding.
- Compare URL: `https://github.com/BeatyXO/Bidframe/compare/<ACCEPTED_BASELINE_SHA>...<FINAL_MILESTONE_SHA>` (accepted baseline pending confirmation).

## Before

At the pre-milestone repository baseline, Bidframe supports frozen move-in evidence and item deduction caps, sealed move-out evidence with challenge/replacement handling, GenLayer semantic damage classification, deterministic deductions, conservative inconclusive recovery, and deterministic deposit settlement. These are existing capabilities, not new milestone work. This statement does not establish which commit was accepted as the submission baseline.

## New in this milestone

This milestone adds one bounded tenant remediation attempt after a successful `NEW_DAMAGE` assessment: a DRAFT-only cure policy frozen at funding, an assessment-based deadline, immutable hash-bound cure evidence, a GenLayer `RESTORED` / `NOT_RESTORED` / `INCONCLUSIVE` decision, preserved original adjudication alongside an effective deduction, and waiver/expiry liveness. If scheduled item amounts exceed the deposit, the original charged amount is allocated in assessment order up to the remaining deposit; the uncapped severity-mapped amount remains separately available for audit. Cure eligibility requires a positive original charged amount, and restoring an item releases only that item's amount. It also adds reviewer reads, frontend controls, adversarial tests, CI coverage, and (after local implementation and hostile review) a fresh Studionet deployment and live proof.

## Not milestone work

The existing agreement lifecycle, evidence challenge/replacement flow, original damage classifier, and settlement architecture predate this milestone.

## Evidence status

The two-image cure prompt passes 30 Direct Mode tests, GenVM lint/SDK validation and typecheck with `v0.2.16`, 7 frontend tests, frontend typecheck, production build, and hosted CI runs [37039784248](https://github.com/BeatyXO/Bidframe/actions/runs/37039784248), [37042627827](https://github.com/BeatyXO/Bidframe/actions/runs/37042627827), and [37043061036](https://github.com/BeatyXO/Bidframe/actions/runs/37043061036). The final hostile review and runtime findings are in `docs/MILESTONE_SECURITY_REVIEW.md`.

Corrected source was freshly deployed to StudioNet 61999 at `0x9705Fa2dCc1A9b9CD545999F6a93bB4508dD997E`; deployed source parity is exact. Agreement #2 produced the expected mixed `RESTORED` / `NOT_RESTORED` cure decisions and settled 1 GEN with a 0.125 GEN landlord payment, 0.875 GEN tenant refund, and zero contract balance. Its transaction-level proof is recorded in `docs/MILESTONE_LIVE_VERIFICATION.md`. The first deployment and initial full-scene fixture run are explicitly excluded; the diagnostic first deployment's test agreement remains unsettled with its synthetic deposit, as documented.

The owner reports that Vercel was redeployed with the milestone contract. On 2026-10-02, read-only browser checks at `https://bidframe-seven.vercel.app/` confirmed the contract link is `0x9705Fa2dCc1A9b9CD545999F6a93bB4508dD997E`, StudioNet chain ID 61999 is displayed, and Agreement #2 renders the frozen cure policy, `RESTORED` / `NOT_RESTORED`, original versus effective deductions, and settlement amounts matching the live proof. Wallet/network switching and a safe write/receipt check remain unverified because no injected EIP-1193 wallet is available in the browser environment; the already-settled proof agreement was not used for a write. Therefore the milestone remains **IN PROGRESS**, and this is not the final documentation freeze. No pre-milestone deployment or frontend counts as cure workflow proof. The accepted submission baseline remains **PENDING CONFIRMATION**; `7d9b...` is only the pre-milestone repository baseline.
