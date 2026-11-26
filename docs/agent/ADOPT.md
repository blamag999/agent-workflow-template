# SOP: Áp dụng `agent-workflow-template` cho repo mới

Luồng: `1. Khảo sát → 2. Chọn phương án → 3. Cài khung → 4. Tuỳ biến → 5. Xác minh → 6. Commit/PR → 7. Vận hành → 8. Bảo trì`

## 1. Khảo sát (Read-only, nhẹ token)
- Chạy gộp: `git remote -v`, `git branch -a`, `git status`, đọc phần `scripts` của `package.json`, `ls docs/`, kiểm tra nhanh `AGENTS.md` / `CLAUDE.md` / `.agents/`.
- Chốt 4 điểm: nhánh tích hợp & phát hành, lệnh test theo tầng, task đang chạy dở theo luồng cũ, hành động nhạy cảm cần xin duyệt (merge `main`, deploy, migration).

## 2. Chọn phương án
| Phương án | Khi nào dùng | Ghi chú |
| :--- | :--- | :--- |
| **Full replace** | Repo mới, chưa có workflow | Thay toàn bộ theo template |
| **Hybrid** *(Khuyên dùng)* | Có task đang chạy dở | Task mới theo template; giữ nguyên luồng cũ với Legacy note |
| **Minimal** | Repo nhỏ, 1 người/agent | Chỉ cài `AGENTS.md` + Tiered Verification |

## 3. Cài khung & Tuỳ biến
- Copy từ template: `AGENTS.md`, `docs/agent/{MAP,INDEX}.md`, `roles/{planner,coder,reviewer}.md`, `templates/{work,next-prompt,checkpoint,reuse}.md`, `work/.gitkeep`, `archive/.gitkeep`, và wrapper (`CLAUDE.md`, `.agents/rules/project.md`, `.agents/skills/*/SKILL.md`).
- *(Tuỳ chọn)* Sync `token-guard` (loại trừ `config.json`, `.state/`, `__pycache__`), thêm `__pycache__/` và `*.pyc` vào `.gitignore`.
- Tuỳ biến: chuẩn nhánh `task/<ID>` (hoặc giữ mặc định `work/<ID>-<slug>` của template — mỗi repo chọn 1 chuẩn thống nhất), điền `MAP.md`, đặt Tiered Verification (T1/T2/T3), project invariants, do-not-read list, legacy note, approval gates.
- *(Tuỳ chọn)* Thêm script `scripts/checkpoint.mjs` (Node) để tự xuất `Health`, `Δ`, `Hotspots` vào `docs/agent/CHECKPOINT.md`.

## 4. Xác minh & Commit
- Grep sạch placeholder (`TODO`, tên nhánh mẫu không khớp), chạy T1 pass, kiểm tra `git status`.
- Gom 1 commit trên nhánh tích hợp (hoặc PR), push và kiểm tra `HEAD == origin`.

## 5. Vận hành & Bảo trì
- Vận hành: `Planner (work file) → Coder (task/<ID>, T1/T2) → Reviewer (T3) → Planner (merge, archive, cập nhật CHECKPOINT.md)`. `NEXT PROMPT` chỉ xuất trong chat.
- Bảo trì: định kỳ diff với template (**không** ghi đè `config.json` / `.state/`); rà lại `MAP.md` và `REUSE.md` sau mỗi 5–10 task.

## Mẫu prompt khởi động (cho repo mới)
> Khảo sát nhanh repo hiện tại (read-only: git branch/remote/status, `package.json` scripts, `docs/`, rule cũ nếu có) rồi đề xuất phương án áp dụng `blamag999/agent-workflow-template` theo hướng tối ưu token. Báo cáo ngắn gọn phương án (Full/Hybrid/Minimal) trước khi thực hiện.
