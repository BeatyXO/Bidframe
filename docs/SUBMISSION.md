# Bidframe Submission Evidence

## Current canonical deployment

- Product: Bidframe — Consensus Security-Deposit Settlement
- Network: GenLayer StudioNet, chain ID `61999`
- Intelligent Contracts: exactly one, `contracts/Bidframe.py`
- Contract: [0x3f5F81618cc86604f7094E525F46f37363CD99a7](https://explorer-studio.genlayer.com/address/0x3f5F81618cc86604f7094E525F46f37363CD99a7)
- Deployment transaction: [0x3b63ca8a9d71f1174422c1b0b42737b4d1ca232206eabc50f97c42eb4f34ebc3](https://explorer-studio.genlayer.com/tx/0x3b63ca8a9d71f1174422c1b0b42737b4d1ca232206eabc50f97c42eb4f34ebc3)
- Deployment finality: **FINALIZED / MAJORITY_AGREE / SUCCESS**, 5 validators
- Deployed source commit: `170112c246bd0ac0b6da737e33629a24ffb11151`
- `contracts/Bidframe.py` SHA-256: `3bd0f351abe27649776d9e804616ea4215bcdba1ae2005e72d636d586b1dffa3`
- Source parity: verified against `genlayer code` from the canonical StudioNet address. Normalized deployed source equals the local contract file byte-for-byte; normalized RPC source SHA-256: `0953d405ab58d395539a293d1aec99d517d8e0742f7490fc3e41b8c6daa60c07` (the file SHA above is over the original CRLF file bytes).
- Explorer: [StudioNet explorer](https://explorer-studio.genlayer.com)

An earlier saved code-query output was stale and did not represent the canonical address. The parity result above comes from a fresh direct query of the canonical address.

## Final repository hardening

- Wallet/CI/documentation hardening merge: `248836c516457ada6bd8b2426de96caf4c2d3545`
- GitHub Actions Quality run: [35449480448](https://github.com/BeatyXO/Bidframe/actions/runs/35449480448) — **PASS**
- Final submission-pass validation run: [35454602671](https://github.com/BeatyXO/Bidframe/actions/runs/35454602671) — **PASS** (GenVM lint, 19 Direct Mode tests, submission fingerprint, `npm ci`, typecheck, production build).
- Contract source was not changed by the wallet hardening, so the canonical deployment/source-parity record below remains valid.
- The live production URL is [https://bidframe-seven.vercel.app/](https://bidframe-seven.vercel.app/).

## Local validation

- GenVM lint: **PASS**, `genvm-lint check contracts/Bidframe.py` (set `PYTHONIOENCODING=utf-8` on Windows so the checkmark output is printable).
- Direct Mode: **PASS**, `gltest tests/ -v`, 19 tests.
- Frontend typecheck: **PASS**, `npm run typecheck`.
- Frontend production build: **PASS**, `npm run build` (Vite reports the GenLayer client chunk exceeds its 500 kB advisory threshold).
- Contract remains configured for stable StudioNet only, chain ID `61999`.

## Finalized live lifecycle record

The detailed sanitized public transaction/readback log is [`studionet-lifecycle.json`](studionet-lifecycle.json). The live run used agreement `3`, landlord `0x7876E9F76F32925c212528D57BC9DfE5E34bCC07`, tenant `0xA94Bade0375ECe65cB7056C9C89E8e39e3EFb485`, and an exact `1 GEN` deposit.

| Action | Transaction | Result |
|---|---|---|
| Create agreement | [0x7cf56031267210dc923993655c8dab153d7b04ff143a77a382405c1205ee5bd4](https://explorer-studio.genlayer.com/tx/0x7cf56031267210dc923993655c8dab153d7b04ff143a77a382405c1205ee5bd4) | Finalized success; readback agreement 3 |
| Register item 1 | [0x181111462bf14930d62f8d48658828e51b8bebc60f682e69d780e9e93b17ed96](https://explorer-studio.genlayer.com/tx/0x181111462bf14930d62f8d48658828e51b8bebc60f682e69d780e9e93b17ed96) | Finalized success |
| Register item 2 | [0xe2f8172ae2ea34fdbb339fe8943f8b0125c4595bc468d4117065d7bf6071e2ed](https://explorer-studio.genlayer.com/tx/0xe2f8172ae2ea34fdbb339fe8943f8b0125c4595bc468d4117065d7bf6071e2ed) | Finalized success |
| Register item 3 | [0xa9628a50619052f0844fd757690a81bf9b98a0a982bbffb880a7091ab46c4b3b](https://explorer-studio.genlayer.com/tx/0xa9628a50619052f0844fd757690a81bf9b98a0a982bbffb880a7091ab46c4b3b) | Finalized success |
| Tenant funds exact 1 GEN | [0xa65186cf7184c41ca8d5b432cf5d9ee62b3a5259cab74a4df60b1d8b70f0e6f4](https://explorer-studio.genlayer.com/tx/0xa65186cf7184c41ca8d5b432cf5d9ee62b3a5259cab74a4df60b1d8b70f0e6f4) | Finalized success; contract balance increased exactly 1 GEN; agreement ACTIVE |
| Open checkout | [0x3e798cce3daf0e32c53c55fd28981a525702a47963cdfde7a14fcc9200b1b5f8](https://explorer-studio.genlayer.com/tx/0x3e798cce3daf0e32c53c55fd28981a525702a47963cdfde7a14fcc9200b1b5f8) | Finalized success |
| Submit item 1 evidence | [0x87a5ebd925eb620f4b1fe46f43e696ba232e417a689155cab86e73b194ef9a33](https://explorer-studio.genlayer.com/tx/0x87a5ebd925eb620f4b1fe46f43e696ba232e417a689155cab86e73b194ef9a33) | Finalized success; hash-bound readback |
| Submit item 2 evidence | [0x85226906f9e291c2f0b2a98712f5e3add88d3d21128748c7d585dead37d99df6](https://explorer-studio.genlayer.com/tx/0x85226906f9e291c2f0b2a98712f5e3add88d3d21128748c7d585dead37d99df6) | Finalized success; hash-bound readback |
| Submit item 3 evidence | [0xb0b23b9c9b9b107a654edec87e0852a71e1ffb94adbc8d141df0e82affe75ea7](https://explorer-studio.genlayer.com/tx/0xb0b23b9c9b9b107a654edec87e0852a71e1ffb94adbc8d141df0e82affe75ea7) | Finalized success; hash-bound readback |
| Challenge item 3 evidence | [0x1fa9b2da2d4de6b2aafabd82c214ca4c85b32fd6e70eb582c9ceac9c3602eef7](https://explorer-studio.genlayer.com/tx/0x1fa9b2da2d4de6b2aafabd82c214ca4c85b32fd6e70eb582c9ceac9c3602eef7) | Finalized success |
| Assessment while challenged | [0x5c8aa9a66a2cd42d84d25973c0fc11b3223f341c9784efb507220fb9cbe49e7a](https://explorer-studio.genlayer.com/tx/0x5c8aa9a66a2cd42d84d25973c0fc11b3223f341c9784efb507220fb9cbe49e7a) | Finalized contract error as expected; assessment remained blocked |
| Resolve challenged item at zero | [0x88469555fd7c680bd38ae320eec80b54a85a0695e311f81d49a5ab4d1dd0b175](https://explorer-studio.genlayer.com/tx/0x88469555fd7c680bd38ae320eec80b54a85a0695e311f81d49a5ab4d1dd0b175) | Finalized success; zero deduction readback |
| Assess unchanged item 1 | [0x565e8b4631ae048d38a584b3574ccad3ab3751dbd4cb1d218239a0768bed9628](https://explorer-studio.genlayer.com/tx/0x565e8b4631ae048d38a584b3574ccad3ab3751dbd4cb1d218239a0768bed9628) | Finalized success; readback `UNCHANGED`, severity 0, deduction 0 |
| Assess damage item 2 | [0xa9191c54a62633fd2cd5e372de239ace8d24f2a54daefce15dc709271c7de680](https://explorer-studio.genlayer.com/tx/0xa9191c54a62633fd2cd5e372de239ace8d24f2a54daefce15dc709271c7de680) | Finalized `MAJORITY_DISAGREE` / execution error; item stayed unassessed and no deduction was applied |
| Challenge unresolved item 2 | [0xcacdcaa93e1940c119365d91e7fda1384327d3b2f15b293451bc12abffd127b2](https://explorer-studio.genlayer.com/tx/0xcacdcaa93e1940c119365d91e7fda1384327d3b2f15b293451bc12abffd127b2) | Finalized success |
| Resolve item 2 at zero | [0xfe20619a5a86b4dd209f1905592c145001c5f37cabbf77f56f90f4dc78f95666](https://explorer-studio.genlayer.com/tx/0xfe20619a5a86b4dd209f1905592c145001c5f37cabbf77f56f90f4dc78f95666) | Finalized success; resolved conservatively at zero deduction |
| Mark READY | [0xe7c3430efb9739c8e3daaa72b59db82ffb13fde9322e7febbcea70856cd04b34](https://explorer-studio.genlayer.com/tx/0xe7c3430efb9739c8e3daaa72b59db82ffb13fde9322e7febbcea70856cd04b34) | Finalized success; readback READY |
| Settle | [0xbf51309feb425226c81854c55f1c6ddebc15307614a3c5401dc14ae5ee18c543](https://explorer-studio.genlayer.com/tx/0xbf51309feb425226c81854c55f1c6ddebc15307614a3c5401dc14ae5ee18c543) | Finalized success; readback SETTLED |
| Second settlement attempt | [0x05e2192b7c9c5e584f0596bd1dd8b13fa177715a6db21f27d38c273458d50b27](https://explorer-studio.genlayer.com/tx/0x05e2192b7c9c5e584f0596bd1dd8b13fa177715a6db21f27d38c273458d50b27) | Finalized `MAJORITY_AGREE` / execution error / rollback; readback remained SETTLED and balances unchanged |

Settlement readback confirmed deduction `0 GEN`, tenant refund `1 GEN`, and contract balance `0 GEN`; tenant balance rose from `1 GEN` to `2 GEN`. The repeated-settlement transaction finalized as rollback with agreement state still `SETTLED`; readback showed landlord `98 GEN`, tenant `2 GEN`, contract `0 GEN`, with no additional payout. This is native GEN transfer evidence for the zero-deduction path. No landlord deduction/payment was due in this run.

## Agreement #4 — positive NEW_DAMAGE economic proof

The previously missing positive path is now verified independently from StudioNet readback and the Studio explorer feed. The permanent machine-readable record is [`studionet-new-damage-lifecycle.json`](studionet-new-damage-lifecycle.json).

Agreement `4` used landlord `0x98ACB6B20ee0f730d0b433c6f7167de792D8a2Dd`, tenant `0x95B37d7bF3F1b1B9e9a1Ae8300c627135C095375`, and an exact `1 GEN` deposit. It finalized `SETTLED` with one assessed item, raw/final deduction `0.5 GEN`, and tenant refund `0.5 GEN`.

| Action | Transaction | Verified result |
|---|---|---|
| Create agreement #4 | [0x34a16dfd754a7c95610036d796a5bdcc0e34c5cec0dda123b1f55440f6c0aad2](https://explorer-studio.genlayer.com/tx/0x34a16dfd754a7c95610036d796a5bdcc0e34c5cec0dda123b1f55440f6c0aad2) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| Register item 1 | [0xb9b66391804bb0dc3de455995973f059d29f040dbd0f34a51372d0742bd8ab9b](https://explorer-studio.genlayer.com/tx/0xb9b66391804bb0dc3de455995973f059d29f040dbd0f34a51372d0742bd8ab9b) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| Tenant funds exact 1 GEN | [0xd6ac2104e468445982ad4fdbaa15e6a14da832c70e7f2cb1225f0d7287301fbe](https://explorer-studio.genlayer.com/tx/0xd6ac2104e468445982ad4fdbaa15e6a14da832c70e7f2cb1225f0d7287301fbe) | FINALIZED / MAJORITY_AGREE / SUCCESS; value 1 GEN |
| Open checkout | [0xe6d0552086fda235400ba9de3af9509c63ff78d364d80eb2ea987fc79272981d](https://explorer-studio.genlayer.com/tx/0xe6d0552086fda235400ba9de3af9509c63ff78d364d80eb2ea987fc79272981d) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| Submit damaged move-out evidence | [0x9d00dd3d546f0d55cb45a1d8772f6c0644bfcb12e380ab6afc2ac3aa01a6a234](https://explorer-studio.genlayer.com/tx/0x9d00dd3d546f0d55cb45a1d8772f6c0644bfcb12e380ab6afc2ac3aa01a6a234) | FINALIZED / MAJORITY_AGREE / SUCCESS |
| Assess item | [0xa934622ff2808edccf5ed46fd59e70ed4d0490534dc489a0b587ecf0ddb51ce1](https://explorer-studio.genlayer.com/tx/0xa934622ff2808edccf5ed46fd59e70ed4d0490534dc489a0b587ecf0ddb51ce1) | FINALIZED / MAJORITY_AGREE / SUCCESS; readback `NEW_DAMAGE`, severity 3 |
| Mark READY | [0x4a99d6ac19115103a133ebdb788460d0442b71b89f33c8d62a4bc74e9cfe5d46](https://explorer-studio.genlayer.com/tx/0x4a99d6ac19115103a133ebdb788460d0442b71b89f33c8d62a4bc74e9cfe5d46) | FINALIZED / MAJORITY_AGREE / SUCCESS; READY |
| Settle | [0xff14d0808973445fab66aaadd0b1477d24b4ea98b9f77aacc4a9a8e904f12235](https://explorer-studio.genlayer.com/tx/0xff14d0808973445fab66aaadd0b1477d24b4ea98b9f77aacc4a9a8e904f12235) | FINALIZED / MAJORITY_AGREE / SUCCESS; SETTLED |
| Native landlord payment | [0x8eca95990809fa22d25734009fac93768d8d6b01679d2844a621faaf6c854620](https://explorer-studio.genlayer.com/tx/0x8eca95990809fa22d25734009fac93768d8d6b01679d2844a621faaf6c854620) | FINALIZED; contract → landlord, 0.5 GEN |
| Native tenant refund | [0x86518dd0f9f5659a7ea6f8b38246ab7f9235c81d2c95b2e0018590ccb7372ab5](https://explorer-studio.genlayer.com/tx/0x86518dd0f9f5659a7ea6f8b38246ab7f9235c81d2c95b2e0018590ccb7372ab5) | FINALIZED; contract → tenant, 0.5 GEN |

The item is `Living room wall`. Baseline evidence is `https://raw.githubusercontent.com/BeatyXO/bidframe-evidence/main/normal.png` with SHA-256 `00f30ebf06cb869089fb2c4614f3a0b6385d4eb94c3e7494b1ed14ddd82ab3bc`. Checkout evidence is `https://raw.githubusercontent.com/BeatyXO/bidframe-evidence/main/damaged.png` with SHA-256 `c86127256ba510862f0fd850ee362945aed458287adcca5528b1ba454705e313`.

The frozen item schedule was minor `0.1 GEN`, moderate `0.25 GEN`, severe `0.5 GEN`, missing `1 GEN`. The finalized verdict was `NEW_DAMAGE`, severity `3`, so the contract deterministically selected the already-frozen severe amount: `0.5 GEN`. The settlement leader receipt scheduled exactly `0.5 GEN` to the landlord and `0.5 GEN` to the tenant; the two finalized child transfer transactions above prove those native GEN movements. Therefore Agreement #4 accounting closes exactly: `0.5 + 0.5 = 1 GEN`.

### Historical residual-balance observation

A separate earlier funding attempt, [0xa48161b06f505bf8b3964f5f00882446a788773b6cb5edfe715e6fa6719640e7](https://explorer-studio.genlayer.com/tx/0xa48161b06f505bf8b3964f5f00882446a788773b6cb5edfe715e6fa6719640e7), sent `1 GEN` before inventory registration. It finalized `MAJORITY_AGREE` but the contract execution result was `ERROR / rollback`. A fresh StudioNet balance query after Agreement #4 settlement reports a global contract balance of `1 GEN`; agreements 1–4 all read `SETTLED`. The residual is therefore recorded separately from Agreement #4's fully distributed escrow rather than being misreported as Agreement #4 funds. The current frontend blocks tenant funding while `item_count === 0`, preventing that specific invalid UI path from being offered again.

The required positive economic proof is no longer missing. Together, Agreement #3 and Agreement #4 demonstrate both fail-closed/recovery behavior and a successful nonzero damage settlement.
## Frontend delivery

- Live frontend: [https://bidframe-seven.vercel.app/](https://bidframe-seven.vercel.app/)
- Canonical contract: `0x3f5F81618cc86604f7094E525F46f37363CD99a7`
- Canonical build-time override: `VITE_CONTRACT_ADDRESS=0x3f5F81618cc86604f7094E525F46f37363CD99a7`
- Explorer setting: `VITE_EXPLORER_BASE=https://explorer-studio.genlayer.com`
- The frontend also pins the same canonical address as its production-safe default so a missing Vercel environment variable cannot silently disconnect the live app from the documented deployment.
- Wallets are injected EIP-1193 only; no MetaMask Snap is required.

### Wallet failure root cause and remediation

The earlier browser path manually switched/added StudioNet and then called `genlayer-js@1.1.8` `client.connect('studionet')`. That SDK helper also calls `wallet_getSnaps` and may request the GenLayer MetaMask Snap, which conflicts with Bidframe's injected-wallet-only product boundary and can fail after the chain itself is already correct.

The fixed frontend now:

1. requests accounts;
2. reads `eth_chainId`;
3. requests `wallet_switchEthereumChain` to `0xF22F`;
4. on error 4902, adds GenLayer StudioNet with the canonical RPC, GEN/18 metadata and explorer;
5. explicitly requests the switch again after adding;
6. re-reads `eth_chainId` and refuses to construct a write client unless it is exactly `0xF22F`;
7. creates the `genlayer-js` client only against that verified injected provider;
8. preserves actionable 4001, 4902, -32002 and nested/plain-object provider errors;
9. hydrates already-authorized sessions on page load using `eth_accounts` without a popup when the wallet is already on StudioNet;
10. automatically rebuilds the provider-backed client on compatible `accountsChanged` / `chainChanged` events, while leaving writes disabled on the wrong network;
11. exposes a local wallet menu for copy, explorer and Bidframe-local disconnect without claiming to revoke wallet permissions;
12. persists submitted transaction hashes and reconciles them with StudioNet so a wait timeout remains `finalizing`, not a false terminal failure;
13. refreshes the loaded agreement after confirmed writes and on focus/visibility/periodic case reconciliation, with conservative polling to reduce rate-limit pressure.

The contract source is unchanged by this wallet fix, so the canonical deployment/source-parity evidence remains valid.

## Historical deployment — superseded

- Contract: [0x7d7559B0723c66eB5994a641b5A26cB6682e7dfF](https://explorer-studio.genlayer.com/address/0x7d7559B0723c66eB5994a641b5A26cB6682e7dfF)
- Deployment transaction: [0x5427994a3b7ceeb5951ee349949815e7d8d8d4114e05c0251dd26c041c37b183](https://explorer-studio.genlayer.com/tx/0x5427994a3b7ceeb5951ee349949815e7d8d8d4114e05c0251dd26c041c37b183)
- Historical source SHA-256: `b5858de3937fea08560ec95338a8dc967fd97f8b750805536cb188fbe5ea6733`
- This deployment predates liveness-safe zero-deduction recovery and is not canonical.
