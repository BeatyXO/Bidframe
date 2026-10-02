# Remediation / Cure Verification: live proof

## Proven deployment

- Network: GenLayer StudioNet, chain ID `61999`.
- Fresh milestone contract: [`0x9705Fa2dCc1A9b9CD545999F6a93bB4508dD997E`](https://explorer-studio.genlayer.com/address/0x9705Fa2dCc1A9b9CD545999F6a93bB4508dD997E).
- Deployment transaction: `0xd4aab6db115072fcd1139496fc41ac373ccc61f91aeedffd5f0d7a2128d472c5` (`FINALIZED`, `MAJORITY_AGREE`).
- Contract source commit: `60fdf9fec916bffc1c627382740de0a6cd47b56b`.
- Working-tree source SHA-256 (CRLF checkout): `56284cf19d24d36374c7571f262bd09cc46af1442693159fd1b44e0c77135c13`.
- After normalizing line endings to LF, local and `gen_getContractCode` UTF-8 source SHA-256: `f72296e6d5454248fb86ae0363c468bf12ef0df4a8996401b5059f13b58e135a` (exact text parity).
- Deployed schema: 21 methods.
- Live fixture commit: `5943b6ab7793c1b1ac275aa5adfaf941e46e1a58`.
- Fixture provenance: deterministic synthetic illustrations, explicitly not photographs or real tenancy evidence. Each item has isolated baseline, move-out, and cure crops. Their bytes were fetched from pinned HTTPS URLs and SHA-256 verified by the runner before any transaction.

The fresh deployment is separate from the repository's pre-milestone Bidframe deployment. Agreement #2 below is the replacement lifecycle proof included in this milestone. It is synthetic protocol evidence only; it does not establish a real-world tenancy or property condition.

## Agreement #2 lifecycle

- Agreement ID: `2`; property reference: `SYNTHETIC-CURE-5943b6ab7793`.
- Landlord: `0xF4A4293ca8dfE50E042d4F5b8afA9C4506CAbCe3`; tenant: `0x4c6994c7cB4Afe99D8bfA72BC39DB8185027ead1` (fresh test accounts).
- DRAFT cure policy was set to 900 seconds before inventory registration/funding.
- Exact tenant deposit: `1 GEN` (`1000000000000000000` wei).
- Both isolated items were assessed `NEW_DAMAGE`, severity 2, with `0.125 GEN` original charged deduction per item.
- Tenant submitted one hash-bound cure for each item. Both submissions were recorded as `SUBMITTED`; the `READY` call while cures were open finalized as a contract rollback.
- GenLayer assessed item 1 as `RESTORED`: original deduction remains `0.125 GEN`, effective deduction becomes `0`.
- GenLayer assessed item 2 as `NOT_RESTORED`: original and effective deductions remain `0.125 GEN`.
- Agreement advanced to `READY` and then `SETTLED` after both cure assessments.
- Settlement arithmetic: `0.125 GEN` landlord payment + `0.875 GEN` tenant refund = exact `1 GEN` deposit. Post-settlement contract balance: `0`.

Finalized transaction IDs:

| Action | Transaction |
| --- | --- |
| Create Agreement #2 | `0xb8184c423b693d1f861bc56e09a5c09f7ab424cc502eeb2061e49d4f0d95d45d` |
| Freeze DRAFT cure policy | `0xe39620fd4c5a890dde22c925ef8cb209e52a01764c68f4942068a3128932a29f` |
| Register item 1 / item 2 | `0x143d782491d718b3928d0ccf98f68d5c19b612d5165416e082a9c4e2660b0e9d` / `0x377945b43334168d20a02fcbfb629c7d87a265a1fc7a5e6f5823d8af1bb57257` |
| Fund exact deposit | `0x897b013d3b2ff809c48a70cad549ae5091e7ad465a1c9de174a57781373c3f47` |
| Open checkout | `0x8e99679c5838dcc3edcf9cb1d6238981f8c6addb85066d7626ddc37e74130553` |
| Submit checkout evidence 1 / 2 | `0x662433e218603a14c267ae503512b6308ce85dbf531da5ad6ed05245fb95a870` / `0xbcfd7f9caa86a4c0da32f2af524ee568bcfacf9112c4850656620bfceaaf1d96` |
| Original assessment 1 / 2 | `0x7f18b6944241ed036fa4676b71787b1cadbf836846b07f301095f16557f69536` / `0xadd866997b572343d249c6351993b7ed7aa36117ca343847d0b912daf8f28c3a` |
| Submit cure 1 / 2 | `0x2f7e95c7e336e9158f0d1db5440e14a127003ab8054381fdac8e31d689df26f2` / `0x077a87c3a1fcca2af2a2e9d8d21213764754edb7be7bd620e8b0af586241549d` |
| `READY` blocked while cure open | `0xfdde42d4b7721a22e4f1f8bd6e31396763af12ae084fb248d734e5c9fb41ac62` (`ERROR` / rollback; expected) |
| Assess cure 1 / 2 | `0xcdc32efee14a5692866c5532e258ef90a710e67a8b8bd703b0ab2c4862b3b920` / `0x4d21b9027e734ddf5de74a458c82e63ff5778c6ecb43234ff00738bf5b0fa4bb` |
| Mark `READY` | `0x1f0d489b160e055e766e7e744f7b3c8fc5d99ec55ffcabc2718250d655cd7b05` |
| Settle | `0x800d948275745b7fce39d76098a937a7739b0186e3f4b220abc1f8fbe07cca88` |

## Excluded diagnostic runs

- The first fresh deployment `0xd5F5E42D46AFa23903dd479e19667029f77247e4` used the pre-correction three-image prompt. Its cure call failed because the StudioNet GenVM runtime rejected the third image. It is excluded from proof.
- Agreement #1 on that diagnostic deployment has both cure opportunities expired, but its party-only `mark_ready` and `settle` calls rolled back: the test parties' private keys had been generated only in memory and were not retained. Its current state remains `ASSESSING` with a 1 GEN synthetic test deposit in the diagnostic contract. Do not use that agreement or deployment as milestone proof.
- Agreement #1 on the corrected fresh contract used the initial full-scene fixtures and produced two `NOT_RESTORED` verdicts; it settled correctly but is also excluded from mixed-verdict proof. This led to the isolated crop fixtures and the verified Agreement #2 above.

## Remaining release steps

Contract, frontend, adversarial tests, hostile review, hosted CI, fresh deployment, source parity, and the synthetic live mixed-verdict lifecycle are complete.

## Production frontend read-only verification

On 2026-10-02, the owner reported redeploying `https://bidframe-seven.vercel.app/` with the milestone contract. Read-only browser checks confirmed:

- StudioNet chain ID `61999` is displayed.
- Contract links target `0x9705Fa2dCc1A9b9CD545999F6a93bB4508dD997E`.
- Loading Agreement #2 renders the 0.25-hour frozen cure policy, original 0.125 GEN deductions for both items, `RESTORED` / 0 GEN effective deduction for item 1, `NOT_RESTORED` / 0.125 GEN effective deduction for item 2, and the 1 GEN deposit / 0.125 GEN deduction / 0.875 GEN refund settlement.

Wallet-dependent manual checks remain pending. The available in-app browser reported `No injected EIP-1193 wallet found`; no available browser exposed a connected wallet. Network switching, an injected-wallet write, and post-write receipt handling could not be exercised. Agreement #2 is already settled, so no write was attempted against it and the canonical lifecycle was not rerun. The Vercel settings were not changed by the agent.
