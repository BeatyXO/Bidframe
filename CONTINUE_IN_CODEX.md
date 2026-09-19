# Continue Bidframe in Codex

Current status is no longer an initial handoff.

- Repository: `BeatyXO/Bidframe`
- Network: GenLayer StudioNet only, chain ID `61999 / 0xF22F`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`
- Canonical contract: `0x3f5F81618cc86604f7094E525F46f37363CD99a7`
- Canonical deployment tx: `0x3b63ca8a9d71f1174422c1b0b42737b4d1ca232206eabc50f97c42eb4f34ebc3`
- Live frontend: `https://bidframe-seven.vercel.app/`
- Architecture: exactly one Python Intelligent Contract, `contracts/Bidframe.py`

## What is already proven

The repository already contains finalized StudioNet evidence for:

- canonical deployment and source parity;
- exact 1 GEN tenant funding;
- public hash-bound evidence;
- a successful `UNCHANGED` assessment;
- evidence challenge blocking assessment;
- zero-deduction challenge recovery;
- READY and SETTLED transitions;
- native tenant refund and zero contract balance;
- repeat-settlement rollback;
- 19 Direct Mode tests.

Do not discard or replace that evidence.

## Wallet integration

The frontend must use injected EIP-1193 wallets only. It must not request MetaMask Snaps.

The production wallet path should:

1. request accounts;
2. read `eth_chainId`;
3. switch to `0xF22F`;
4. on 4902, add StudioNet with the canonical RPC/GEN/explorer metadata;
5. explicitly switch again after adding;
6. verify `eth_chainId === 0xF22F`;
7. create the provider-backed GenLayer client only after verification;
8. preserve useful 4001 / 4902 / -32002 / provider error messages;
9. clear stale write-client state on `accountsChanged` and `chainChanged`.

Do not call the `genlayer-js@1.1.8` `client.connect('studionet')` helper in this injected-wallet-only flow because that helper invokes MetaMask Snap APIs.

## Remaining submission proof

The only material contract proof still missing is a successful positive economic path:

`NEW_DAMAGE -> severity 1/2/3 -> frozen deterministic deduction -> READY -> SETTLED -> nonzero landlord GEN transfer + tenant remainder`.

Use clear, stable, publicly reachable before/after image evidence. Preserve SHA-256 binding and the bounded verdict/severity equivalence rule. If repeated high-quality evidence still causes validator disagreement, make only the smallest justified adjudication change, then re-run lint/tests and redeploy the exact changed contract source before claiming parity.

## Required final gates

Before submission:

- `genvm-lint check contracts/Bidframe.py`
- Direct Mode tests green
- `python scripts/verify_submission.py`
- `npm ci`
- `npm run typecheck`
- `npm run build`
- GitHub Actions green
- live frontend points at the canonical contract
- live wallet switching works on StudioNet 61999
- successful `NEW_DAMAGE` assessment and nonzero settlement transfer are documented
- README, threat model and submission evidence match reality
- final changes are pushed to `main`

Do not claim submission readiness while the positive-damage settlement proof is still missing.
