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

## Known limitations before submission

1. The previous StudioNet deployment predates the liveness fixes and is superseded; the revised contract requires a fresh canonical StudioNet 61999 deployment.
2. Native GEN funding and emitted settlement transfers still need live StudioNet balance/transaction proof on the revised deployment.
3. Direct Mode covers `INCONCLUSIVE` blocking and validator disagreement; a real ambiguous image case remains useful deployment evidence.
4. URLs are HTTPS + hash-bound, but availability remains external. Unavailable sources intentionally fail closed rather than being treated as evidence.

