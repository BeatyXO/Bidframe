# Bidframe Submission Evidence

This file distinguishes historical deployment evidence from the current audited source. Do not treat the previous deployment as canonical after the liveness fixes.

## Current source status

- Repository: `BeatyXO/Bidframe`
- Audit base before fixes: `abb905ba9265bc3b1988c332c7a777cc73691005`
- Liveness-fix merge commit: `aa116d7039f6892fe2577863e493350f81f6aa42` on `main`
- Network target: GenLayer StudioNet, chain ID `61999`
- Intelligent Contracts: exactly one Python contract, `contracts/Bidframe.py`

The audited revision adds two liveness-safe recovery paths:

1. challenged evidence may be resolved by either party at **zero deduction**;
2. a finalized `INCONCLUSIVE` item may be resolved by either party at **zero deduction**.

Neither path can create or increase a landlord charge. Their purpose is only to prevent a security deposit from being trapped indefinitely.

## Historical deployment — superseded

- Contract: [`0x7d7559B0723c66eB5994a641b5A26cB6682e7dfF`](https://explorer-studio.genlayer.com/address/0x7d7559B0723c66eB5994a641b5A26cB6682e7dfF)
- Deployment transaction: [`0x5427994a3b7ceeb5951ee349949815e7d8d8d4114e05c0251dd26c041c37b183`](https://explorer-studio.genlayer.com/tx/0x5427994a3b7ceeb5951ee349949815e7d8d8d4114e05c0251dd26c041c37b183)
- Finality recorded previously: **FINALIZED / SUCCESS / MAJORITY_AGREE**
- Historical source SHA-256: `b5858de3937fea08560ec95338a8dc967fd97f8b750805536cb188fbe5ea6733`
- Historical Git commit containing that exact contract source: `abb905ba9265bc3b1988c332c7a777cc73691005`

This deployment is **not canonical for submission anymore** because it does not contain the liveness recovery methods introduced after audit.

## Validation record for the revised source

- GenVM lint: **PASS** on the revised contract in GitHub Actions before merge.
- Direct Mode: **PASS**, 19 tests, GitHub Actions run `35437919189`.
- Frontend dependency install: **PASS**.
- Frontend typecheck: **PASS**.
- Frontend production build: **PASS**.

The 19-test suite includes challenged-evidence recovery and finalized-`INCONCLUSIVE` recovery cases. Before deployment, rerun `genvm-lint check contracts/Bidframe.py` locally with the deployment toolchain as a final source gate.

## Canonical deployment — pending

Do not fill these values until the revised source has been validated and deployed:

- Contract address: **TBD**
- Deployment transaction: **TBD**
- Finality/execution: **TBD**
- Deployed commit SHA: **TBD**
- `contracts/Bidframe.py` SHA-256: **TBD**

The frontend intentionally has no hard-coded fallback contract address after the audit fixes. Set `VITE_CONTRACT_ADDRESS` only to the revised canonical deployment.

## Required live lifecycle proof

On the revised deployment, record real finalized transactions for:

1. create agreement;
2. register at least two items;
3. tenant funds the exact GEN deposit;
4. open checkout;
5. submit checkout evidence;
6. assess one `UNCHANGED` or `NORMAL_WEAR` item;
7. assess one `NEW_DAMAGE` item and verify the frozen deduction mapping;
8. prove one challenge recovery or one `INCONCLUSIVE` zero-deduction recovery;
9. mark the fully resolved agreement `READY`;
10. settle;
11. verify landlord deduction and tenant refund on-chain;
12. verify final state is `SETTLED`;
13. verify a second settlement attempt is rejected.

## Frontend delivery

After canonical deployment:

- set `VITE_CONTRACT_ADDRESS`;
- rerun typecheck and production build;
- verify reads/writes against the revised contract;
- the project owner will deploy the finished frontend to Vercel;
- after that deployment, record the production URL here.

## Submission rule

Do not claim Bidframe is submission-ready until the revised contract, not the superseded deployment, has a complete finalized StudioNet lifecycle and GEN settlement proof.
