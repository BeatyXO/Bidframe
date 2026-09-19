# Bidframe Submission Evidence

This file records verified local and network evidence. Missing lifecycle values remain explicitly unavailable.

## Project and network

- Product: **Bidframe — Consensus Security-Deposit Settlement**
- Network: GenLayer StudioNet, chain ID `61999`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`
- Intelligent Contracts: one Python contract, `contracts/Bidframe.py`

## Local source identity

- Deployed contract input SHA-256: `b5858de3937fea08560ec95338a8dc967fd97f8b750805536cb188fbe5ea6733`
- Source commit SHA: unavailable; this working folder has no `.git` metadata.
- `python scripts/verify_submission.py` confirms the local contract hash above.

The `genlayer code` readback returns the same contract logic with a wrapper/formatting, but the raw download differs byte-for-byte. Its hash is `78b4148f2b71a21d84370e9be316b8374089dbb1821aab6f93a5e1469be96d7b`. Source/deployment byte parity therefore remains unproven.

## Local validation record

- GenVM lint: **PASS**, `genvm-linter 0.11.1rc2`, cached GenVM runner; 3 checks and 14 methods (3 views, 11 writes).
- Direct Mode: **PASS**, `gltest tests/ -v --tb=short`, 16 tests. Windows cleanup workaround defers only cleanup of the loader's still-open stdin tempfile.
- Frontend typecheck: **PASS** before deployed address was wired.
- Frontend production build: **PASS** with Vite `--configLoader runner`; this option is in the build script. Bundle includes a GenLayer SDK chunk size advisory.
- `npm install`: network package access was blocked; `npm install --offline --ignore-scripts --no-audit --no-fund` completed using cached packages.
- The installed `genlayer-test 0.29.2` requested `genlayer-py<0.17.0`, while the machine has `genlayer-py 0.18.0`; Direct Mode ran using the linter runner's extracted GenLayer standard library.

## Canonical deployment

- Contract: [`0x7d7559B0723c66eB5994a641b5A26cB6682e7dfF`](https://explorer-studio.genlayer.com/address/0x7d7559B0723c66eB5994a641b5A26cB6682e7dfF)
- Deployment transaction: [`0x5427994a3b7ceeb5951ee349949815e7d8d8d4114e05c0251dd26c041c37b183`](https://explorer-studio.genlayer.com/tx/0x5427994a3b7ceeb5951ee349949815e7d8d8d4114e05c0251dd26c041c37b183)
- Finality: **FINALIZED**, execution **SUCCESS**, consensus **MAJORITY_AGREE** (5/5 validators); receipt status `7`, result `6`.
- Deployer: `0x7876E9F76F32925c212528D57BC9DfE5E34bCC07` (`bidframe-studionet-61999`), verified balance `100 GEN` before deployment.
- Network verified immediately before deployment: `studionet`, chain `61999`, RPC `https://studio.genlayer.com/api`.
- Deployed commit SHA: unavailable; folder has no Git metadata.

## Live lifecycle proof

No agreement lifecycle has been run yet. Agreement creation, inventory, tenant deposit, checkout, evidence, assessments, READY, settlement, and GEN transfer transaction IDs and finality/readback evidence are unavailable. Native GEN deposit and settlement behavior remain unverified on StudioNet.

## Frontend delivery

The frontend uses `genlayer-js` 1.1.8 with the stable `studionet` chain definition. Its default contract address is the deployment above; `VITE_CONTRACT_ADDRESS` can override it. The app reads agreement/item state, supports lifecycle actions, waits for `FINALIZED`, checks `FINISHED_WITH_RETURN`, refreshes reads, and links transaction hashes to Studio Explorer.

Vercel authentication could not be confirmed, and no production frontend URL is available.

## Remaining evidence required

1. Run and document the complete lifecycle with finality, state readback, and GEN transfer proof.
2. Establish byte-for-byte source/deployment parity with a verifiable deployed source artifact.
3. Re-run typecheck and production build after wiring the canonical address.
4. Deploy the frontend if Vercel authentication is available.
5. Synchronize and verify the finished source on `main` when GitHub access is available.

