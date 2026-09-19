# Bidframe Threat Model

Bidframe assumes two economically opposed parties and potentially adversarial public evidence.

| Threat | Control |
|---|---|
| Landlord changes deduction prices after seeing checkout state | Deduction schedule is only writable in `DRAFT`; tenant funding transitions to `ACTIVE` and freezes inventory. |
| Mutable URL serves different image later | Exact evidence bytes are checked against frozen SHA-256 inside validator execution. |
| One party silently overwrites checkout evidence | Initial checkout submission is write-once. Counterparty challenges instead of overwriting. |
| Challenger substitutes their own evidence unilaterally | Replacement evidence needs a proposal from one party and acceptance by the other; either party can instead waive the disputed item at zero deduction. |
| Image contains prompt-injection text | Classification prompt explicitly treats image text as evidence, never instructions, and output vocabulary is closed. |
| Model invents a repair estimate | Model has no monetary output field. Deduction derives exclusively from the frozen schedule. |
| Model calls normal wear “damage” inconsistently | Validators independently re-run classification and must agree on verdict + severity; protocol appeal remains available. |
| Evidence is too poor to compare | `INCONCLUSIVE` blocks automatic settlement until either party resolves that item at zero deduction; unresolved ambiguity cannot trap the deposit forever. |
| Deductions exceed deposit | Final settlement clamps landlord payment to the locked deposit. |
| Unauthorized third party changes case state | Writes that affect a case are landlord/tenant gated; inventory creation is landlord-only; funding is tenant-only. |
| Repeated settlement drains funds | `settle` changes state to `SETTLED` before emitting value transfers; subsequent calls fail the state guard. |
| Frontend shows a submitted tx as success before consensus | Integration must wait for GenLayer finalization and verify successful execution before refreshing durable state. |

## Current residual risks and evidence notes

1. The revised contract is canonically deployed to StudioNet 61999 and source parity is verified. Agreement #3 proves exact funding, `UNCHANGED`, fail-closed validator disagreement, challenge recovery, zero-deduction settlement/refund, and repeat-settlement rollback. Agreement #4 additionally proves `NEW_DAMAGE` severity 3, deterministic nonzero deduction, READY → SETTLED, and native GEN landlord/tenant transfers.
2. The challenged-evidence escape hatch is intentionally claimant-conservative: either agreement party may resolve a challenged item at zero deduction. Economically, an unresolved dispute cannot be converted into a landlord charge; the claimant must obtain accepted replacement evidence or a successful assessment to support a deduction.
3. Direct Mode covers `INCONCLUSIVE` blocking and validator disagreement; a real ambiguous image case would add evidence but is not required to establish the fail-closed invariant.
4. URLs are HTTPS + hash-bound, but availability remains external. Unavailable sources intentionally fail closed rather than being treated as evidence.
5. Wallet authorization is external browser state. The frontend now hydrates authorized StudioNet sessions with non-intrusive `eth_accounts`, rebuilds the write client after compatible account/network changes, and uses a Bidframe-local disconnect flag so an explicit local disconnect is respected for the rest of the tab session.
6. StudioNet finality can take longer than an SDK receipt wait. The frontend persists the submitted hash immediately and treats timeouts/indexing/rate-limit read errors as non-terminal; it reconciles until a finalized result and only reports FAILED for a definitive finalized failure or pre-hash submission rejection.
7. A historical pre-inventory payable funding attempt (`0xa48161b0…40e7`) finalized with execution `ERROR / rollback` but a fresh StudioNet balance query still shows `1 GEN` on the contract after all agreements 1–4 read `SETTLED`. Agreement #4 itself is fully accounted for by finalized 0.5 GEN landlord and 0.5 GEN tenant transfers. The residual global balance is documented as an observed StudioNet/value-roll-back anomaly from the earlier invalid call; the current frontend no longer exposes funding when `item_count === 0`.
