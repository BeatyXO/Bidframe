# Bidframe Submission Evidence

> This file is intentionally incomplete until live StudioNet proof exists. Do not invent deployment evidence.

## Project

**Bidframe — Consensus Security-Deposit Settlement**

A single GenLayer Intelligent Contract that holds a security deposit, binds before/after evidence by SHA-256, asks validators only for a bounded physical-condition classification, and deterministically converts the result into an exact settlement from a frozen deduction schedule.

## Canonical network

- Network: GenLayer StudioNet
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`

## Canonical deployment

- Contract address: **TBD**
- Deployment transaction: **TBD**
- Deployment status: **TBD**
- Deployed source commit: **TBD**
- `contracts/Bidframe.py` SHA-256: **TBD**

## Required live proof before submission

Record real transaction IDs for all of these:

1. deploy contract;
2. create agreement;
3. register at least two items;
4. tenant funds exact deposit;
5. open checkout;
6. submit checkout evidence;
7. assess an `UNCHANGED` or `NORMAL_WEAR` item;
8. assess a `NEW_DAMAGE` item;
9. demonstrate `INCONCLUSIVE` blocks `mark_ready` in a separate case or direct test;
10. mark a fully-resolved agreement `READY`;
11. settle it and confirm landlord deduction + tenant refund;
12. verify contract state is `SETTLED` and a second settlement attempt is rejected.

## Local quality gate

Before deployment, capture outputs for:

```bash
genvm-lint check contracts/Bidframe.py
pytest tests/ -v
cd frontend && npm ci && npm run build
```

Do not replace failed checks with prose. Fix the implementation and rerun.
