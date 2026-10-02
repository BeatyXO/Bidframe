# Controlled synthetic cure fixtures

These PNGs are deterministic synthetic drawings for the Bidframe Remediation milestone's live protocol walkthrough. They are deliberately simple illustrations, not photographs and not real tenancy evidence. The original full scene has two wall bays; per-item fixtures crop each bay independently so the other item's damage cannot influence a cure verdict.

`move-in-baseline.png` shows both bays intact. `move-out-damaged.png` shows cracks in both bays. `cure-item-a-restored.png` shows the left bay repaired while the right bay remains cracked. `cure-item-b-not-restored.png` retains both cracks and is byte-identical to the move-out image. The `item-a-*` and `item-b-*` files are isolated left/right crops. For item A, the restored cure is byte-identical to its clean baseline. For item B, the not-restored cure is byte-identical to its damaged checkout image.

SHA-256 (exact PNG bytes):

| Fixture | SHA-256 |
| --- | --- |
| `move-in-baseline.png` | `df1c354785e35e44e54c2bd4a694c1041e94c617ea4ba402cc7509a98cf11ef1` |
| `move-out-damaged.png` | `f93f029592989cf8deb7f40d1c66d01b59388f9cb1e4dd7543a9bd8889fe96a1` |
| `cure-item-a-restored.png` | `59ab7195f04db54e071afbef14dbda47024d64d2afa848b742c8680eb9a2ff98` |
| `cure-item-b-not-restored.png` | `f93f029592989cf8deb7f40d1c66d01b59388f9cb1e4dd7543a9bd8889fe96a1` |

Per-item fixture SHA-256 (exact PNG bytes):

| Fixture | SHA-256 |
| --- | --- |
| `item-a-move-in-baseline.png` | `6be8e80deb43ceea18c5889c5d32b69cd133066743cafee1443282906b05015d` |
| `item-a-move-out-damaged.png` | `a8c0b7c0f232cef30aac9a426f8dacc1f6ec7cc14fd3e2996b434d4671cc073d` |
| `item-a-cure-restored.png` | `6be8e80deb43ceea18c5889c5d32b69cd133066743cafee1443282906b05015d` |
| `item-b-move-in-baseline.png` | `47449d9fed8d0cf1a07dd91032d2613913906b9d2f6558d7aca3ec8d735b50fe` |
| `item-b-move-out-damaged.png` | `97f46a802581affa984301f88746bdd33e50ca6d30ef4c69db8efa7a2b0da9a1` |
| `item-b-cure-not-restored.png` | `97f46a802581affa984301f88746bdd33e50ca6d30ef4c69db8efa7a2b0da9a1` |

Recreate them on Windows with `scripts/generate_cure_live_fixtures.ps1`. The live verification record will pin the HTTPS URLs to the commit that contains these files.
