# Bidframe maintenance handoff

Bidframe's submission evidence is complete for both negative/recovery and positive economic paths. This file is now a maintenance handoff, not a request for a missing deployment proof.

- Repository: `BeatyXO/Bidframe`
- Network: GenLayer StudioNet only, chain ID `61999 / 0xF22F`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`
- Current remediation milestone contract: `0x9705Fa2dCc1A9b9CD545999F6a93bB4508dD997E`
- Remediation deployment tx: `0xd4aab6db115072fcd1139496fc41ac373ccc61f91aeedffd5f0d7a2128d472c5`
- Remediation source parity SHA-256 (LF-normalized): `f72296e6d5454248fb86ae0363c468bf12ef0df4a8996401b5059f13b58e135a`
- Historical submission contract and Agreements #3/#4: `docs/SUBMISSION.md` and `docs/studionet-new-damage-lifecycle.json`
- Live frontend: `https://bidframe-seven.vercel.app/`
- Architecture: exactly one Python Intelligent Contract, `contracts/Bidframe.py`

## Verified live evidence

Agreement #3 remains the negative/recovery proof: `UNCHANGED`, validator disagreement fail-closed behavior, challenge blocking and zero-deduction recovery, settlement/refund, and repeat-settlement rollback.

Agreement #4 is the positive economic proof:

- exact 1 GEN successful funding;
- public hash-bound before/after evidence;
- finalized `NEW_DAMAGE`, severity 3;
- frozen severe deduction 0.5 GEN;
- READY and SETTLED;
- finalized native 0.5 GEN payment to the landlord;
- finalized native 0.5 GEN refund to the tenant.

Exact hashes and readbacks are in `docs/SUBMISSION.md` and `docs/studionet-new-damage-lifecycle.json`.

## Frontend invariants

- injected EIP-1193 wallets only; no MetaMask Snaps;
- explicit Connect may request accounts and add/switch StudioNet;
- passive page-load restoration uses `eth_accounts` and never prompts;
- local Disconnect only clears Bidframe's session and does not claim to revoke wallet permission;
- writes require StudioNet `0xF22F`;
- `?agreement=ID` deep links remain supported;
- DRAFT inventory registration remains resumable;
- tenant funding remains unavailable at zero inventory;
- transaction hashes are persisted immediately and reconciled until a terminal StudioNet result;
- timeout/rate-limit/indexing reads after a submitted hash are non-terminal;
- loaded agreement state refreshes after finalization, on focus/visibility, and periodically while the case is active;
- local Recent activity is browser-local proof only, not fabricated global history.

## Known observation

An earlier invalid pre-inventory 1 GEN funding attempt (`0xa48161b06f505bf8b3964f5f00882446a788773b6cb5edfe715e6fa6719640e7`) finalized with contract execution `ERROR / rollback`, but StudioNet currently reports a residual 1 GEN global contract balance while agreements 1–4 all read SETTLED. Do not attribute that residual to Agreement #4: its exact 1 GEN escrow is proven to have been split 0.5/0.5 via finalized child transfers. Preserve this disclosure unless later StudioNet evidence explains or clears the residual.

## Maintenance gates

Before future merges, keep these green:

- `genvm-lint check contracts/Bidframe.py`
- all 30 Direct Mode tests
- `python scripts/verify_submission.py`
- `npm ci`
- `npm run typecheck`
- `npm run build`
- GitHub Actions Quality

Do not change or redeploy the canonical contract unless a future correctness defect explicitly requires a new revision and the entire source-parity/deployment evidence is regenerated.
