# Bidframe Architecture

## Design objective

Bidframe settles a security deposit without turning an LLM into a financial authority. The Intelligent Contract separates **semantic judgment** from **economic execution**.

The semantic question is intentionally narrow: comparing a frozen move-in image with a frozen move-out image, what condition-change class is supported by the evidence?

The economic path is deterministic: the verdict maps to a deduction table that was frozen before the tenant funded the agreement.

## Single-contract state machine

```text
DRAFT
  landlord registers tenant, property reference, terms hash,
  inventory, move-in evidence hashes and deduction caps
   |
   | exact payable deposit from tenant
   v
ACTIVE
   |
   | either party opens checkout
   v
CHECKOUT
   |
   | immutable checkout evidence submitted
   v
ASSESSING
   |
   | one consensus assessment per item
   v
READY  (only if every item resolved and none is INCONCLUSIVE)
   |
   | deterministic payout messages
   v
SETTLED
```

No second escrow/vault contract exists. The same Intelligent Contract holds the native GEN balance and settlement state.

## Evidence binding

For each inventory item the DRAFT phase seals:

- human-readable label and description;
- move-in HTTPS URL;
- expected SHA-256 of the exact move-in bytes;
- minor, moderate, severe and missing-item deductions.

At checkout the exact move-out URL + SHA-256 are submitted. `assess_item` independently fetches both resources inside the nondeterministic block and checks the SHA-256 values **before** sending image bytes to the vision model. A mutable URL cannot silently substitute new bytes without causing the assessment to revert.

## Consensus boundary

The leader and validators independently run the same evidence-retrieval and visual-classification function. The accepted result is constrained to:

```text
UNCHANGED     severity 0
NORMAL_WEAR   severity 0
NEW_DAMAGE    severity 1 | 2 | 3
MISSING       severity 0
INCONCLUSIVE  severity 0
```

Validators compare the consequential fields only: `verdict` and `severity`. Explanatory prose is stored for UX/auditability but is not part of equivalence because two valid models can phrase the same observation differently.

The prompt explicitly instructs validators to treat text inside images as evidence rather than instructions. That limits visual prompt-injection attempts.

## Deterministic settlement

The model never outputs a monetary amount.

- `UNCHANGED` = 0
- `NORMAL_WEAR` = 0
- `NEW_DAMAGE` severity 1 = frozen minor deduction
- `NEW_DAMAGE` severity 2 = frozen moderate deduction
- `NEW_DAMAGE` severity 3 = frozen severe deduction
- `MISSING` = frozen missing deduction
- `INCONCLUSIVE` = blocks settlement

If raw deductions exceed the deposit, the settlement deduction is capped at the exact deposit. The remaining amount is the tenant refund.

## Disputed evidence

Before assessment, the counterparty can challenge submitted move-out evidence. The challenged item cannot be adjudicated. A replacement is only activated when proposed by one party and accepted by the other. After assessment, disputes should use GenLayer's protocol-level appeal mechanism rather than mutating contract evidence/state behind an accepted decision.

## Native value flow

`fund_agreement` is payable and requires exactly the frozen deposit from the registered tenant. On settlement, the contract emits finalized native GEN transfers:

- deduction to the frozen landlord address;
- remainder to the frozen tenant address.

The frontend must display the deposit separately from protocol transaction fees.
