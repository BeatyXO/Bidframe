# Bidframe Remediation / Cure Verification Milestone

## Baselines

- Accepted submission baseline: **PENDING CONFIRMATION**. Repository evidence does not identify which exact commit was accepted as the submission.
- Pre-milestone repository baseline: `7d9b30268d0607b2e012d0be528d21c01101fdf7`.
- Substantive final submission-pass HEAD recorded in repository evidence: `af1225288e7c0b372d07c04633c62e4cb6e149c5`.
- `4d4e9bcb4312f1230dc478dbefe9bca07bddce32` and `7d9b30268d0607b2e012d0be528d21c01101fdf7` are documentation-only follow-ups after that submission-pass HEAD and remain in history.
- Milestone status: **COMPLETE**, frozen on 2026-10-03 after the owner's wallet-enabled browser verification.
- Final repository revision: immutable Git tag `remediation-cure-final`; `git rev-parse remediation-cure-final` resolves the exact freeze commit SHA.
- Pre-milestone compare: https://github.com/BeatyXO/Bidframe/compare/7d9b30268d0607b2e012d0be528d21c01101fdf7...remediation-cure-final. This is a repository milestone comparison, not an accepted-submission comparison.

## Before

At the pre-milestone repository baseline, Bidframe supports frozen move-in evidence and item deduction caps, sealed move-out evidence with challenge/replacement handling, GenLayer semantic damage classification, deterministic deductions, conservative inconclusive recovery, and deterministic deposit settlement. These are existing capabilities, not new milestone work. This statement does not establish which commit was accepted as the submission baseline.

## New in this milestone

This milestone adds one bounded tenant remediation attempt after a successful `NEW_DAMAGE` assessment: a DRAFT-only cure policy frozen at funding, an assessment-based deadline, immutable hash-bound cure evidence, a GenLayer `RESTORED` / `NOT_RESTORED` / `INCONCLUSIVE` decision, preserved original adjudication alongside an effective deduction, and waiver/expiry liveness. If scheduled item amounts exceed the deposit, the original charged amount is allocated in assessment order up to the remaining deposit; the uncapped severity-mapped amount remains separately available for audit. Cure eligibility requires a positive original charged amount, and restoring an item releases only that item's amount. It also adds reviewer reads, frontend controls, adversarial tests, CI coverage, and (after local implementation and hostile review) a fresh Studionet deployment and live proof.

## Not milestone work

The existing agreement lifecycle, evidence challenge/replacement flow, original damage classifier, and settlement architecture predate this milestone.

## Evidence status

The two-image cure prompt passes 30 Direct Mode tests, GenVM lint/SDK validation and typecheck with `v0.2.16`, 7 frontend tests, frontend typecheck, production build, and hosted CI runs [37039784248](https://github.com/BeatyXO/Bidframe/actions/runs/37039784248), [37042627827](https://github.com/BeatyXO/Bidframe/actions/runs/37042627827), [37043061036](https://github.com/BeatyXO/Bidframe/actions/runs/37043061036), [37054492664](https://github.com/BeatyXO/Bidframe/actions/runs/37054492664), and the latest passing [37054843094](https://github.com/BeatyXO/Bidframe/actions/runs/37054843094). The final hostile review and runtime findings are in `docs/MILESTONE_SECURITY_REVIEW.md`.

Corrected source was freshly deployed to StudioNet 61999 at `0x9705Fa2dCc1A9b9CD545999F6a93bB4508dD997E`; deployed source parity is exact. Agreement #2 produced the expected mixed `RESTORED` / `NOT_RESTORED` cure decisions and settled 1 GEN with a 0.125 GEN landlord payment, 0.875 GEN tenant refund, and zero contract balance. Its transaction-level proof is recorded in `docs/MILESTONE_LIVE_VERIFICATION.md`. The first deployment and initial full-scene fixture run are explicitly excluded; the diagnostic first deployment's test agreement remains unsettled with its synthetic deposit, as documented.

The owner redeployed `https://bidframe-seven.vercel.app/` with the milestone contract and reports completing final browser verification from a wallet-enabled browser on 2026-10-03. Independent read-only browser checks on 2026-10-02 confirmed the contract link is `0x9705Fa2dCc1A9b9CD545999F6a93bB4508dD997E`, StudioNet chain ID 61999 is displayed, and Agreement #2 renders the frozen cure policy, `RESTORED` / `NOT_RESTORED`, original versus effective deductions, and settlement amounts matching the live proof. The exact on-chain Agreement #2 hashes behind that rendered state are in `docs/MILESTONE_LIVE_VERIFICATION.md`. No separate browser-originated write hash or test agreement ID was supplied, so wallet signing, network switching, and receipt handling remain owner-reported rather than independently transaction-audited. The final freeze accepts that disclosed evidence limit. No pre-milestone deployment or frontend counts as cure workflow proof. The accepted submission baseline remains **PENDING CONFIRMATION**; `7d9b...` is only the pre-milestone repository baseline.
