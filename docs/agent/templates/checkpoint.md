---
checkpoint_sha: <integration_head_sha>
branch: <integration_branch>
generated_at: <YYYY-MM-DDTHH:MM:SSZ>
---
<!-- Optional convenience cache (Scale-up). Planner-owned, integration-branch-only (updated post-merge, never on work/<ID> branches). Verify ancestry: git merge-base --is-ancestor <checkpoint_sha> HEAD; on divergence fall back to MAP.md + active work file. -->
<!-- L1: 🟢 <branch>@<sha> · T1 <pass/total> · <N> active · next: <1-line> -->
# 🟢 CHECKPOINT · <YYYY-MM-DD> · <branch>@<sha>

| Health | T1 ✅ <pass/total> | T2 ✅ | T3 ⏭ | Typecheck ✅ |
| :--- | :--- | :--- | :--- | :--- |

## Modules
| Module | Trạng thái | Dòng | Ghi chú |
| :--- | :--- | :--- | :--- |
| `<module>` | ✅ / 🔄 / ⏸ | `<loc>` | `<1-line>` |

## Tasks
| ID | Nhánh | Trạng thái |
| :--- | :--- | :--- |
| `<ID>` | `<branch>` | 🔄 / ⏸ |

## Δ Kể từ checkpoint trước
- ➕ `<added>`
- 🔧 `<changed>`

## ⚠ Rủi ro (≤3) · ▶ Tiếp theo (≤3)
- ⚠ `<risk>`
- ▶ `<next>`
