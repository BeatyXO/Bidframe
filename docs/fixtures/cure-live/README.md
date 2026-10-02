# Controlled synthetic cure fixtures

These four PNGs are deterministic synthetic drawings for the Bidframe Remediation milestone's live protocol walkthrough. They are deliberately simple illustrations, not photographs and not real tenancy evidence. The two halves depict distinct wall bays; the jagged dark lines are synthetic wall cracks.

`move-in-baseline.png` shows both bays intact. `move-out-damaged.png` shows cracks in both bays. `cure-item-a-restored.png` shows the left bay repaired while the right bay remains cracked. `cure-item-b-not-restored.png` retains both cracks and is byte-identical to the move-out image. The live item descriptions will refer only to their respective bay.

SHA-256 (exact PNG bytes):

| Fixture | SHA-256 |
| --- | --- |
| `move-in-baseline.png` | `df1c354785e35e44e54c2bd4a694c1041e94c617ea4ba402cc7509a98cf11ef1` |
| `move-out-damaged.png` | `f93f029592989cf8deb7f40d1c66d01b59388f9cb1e4dd7543a9bd8889fe96a1` |
| `cure-item-a-restored.png` | `59ab7195f04db54e071afbef14dbda47024d64d2afa848b742c8680eb9a2ff98` |
| `cure-item-b-not-restored.png` | `f93f029592989cf8deb7f40d1c66d01b59388f9cb1e4dd7543a9bd8889fe96a1` |

Recreate them on Windows with `scripts/generate_cure_live_fixtures.ps1`. The live verification record will pin the HTTPS URLs to the commit that contains these files.
