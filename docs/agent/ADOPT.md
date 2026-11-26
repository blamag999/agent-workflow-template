# SOP: Áp dụng `agent-workflow-template` cho repo mới (Lean v2)

Luồng: `1. Khảo sát → 2. Chọn phương án & hồ sơ → 3. Cài khung → 4. Tuỳ biến → 5. Xác minh → 6. Commit/PR → 7. Vận hành → 8. Bảo trì`

## 1. Khảo sát (Read-only, nhẹ token)
- Chạy gộp: `git remote -v`, `git branch -a`, `git status`, đọc phần `scripts` của `package.json`, `ls docs/`, kiểm tra nhanh `AGENTS.md` / `CLAUDE.md` / `.agents/`.
- Chốt 4 điểm: nhánh tích hợp & phát hành, lệnh test theo tầng (`T1/T2/T3`), task đang chạy dở theo luồng cũ, hành động nhạy cảm cần xin duyệt (merge `main`, deploy, migration).

## 2. Chọn phương án chuyển đổi & Hồ sơ repo (chọn 1 lần khi cài)
**Phương án chuyển đổi:**
| Phương án | Khi nào dùng | Ghi chú |
| :--- | :--- | :--- |
| **Full replace** | Repo mới, chưa có workflow | Cài mới hoàn toàn theo template |
| **Hybrid** *(Khuyên dùng)* | Có task đang chạy dở | Task mới theo template; giữ nguyên luồng/branch/file cũ cho task in-flight (ghi Legacy note + ranh giới chuyển đổi), giữ nguyên approval gates |

**Hồ sơ repo (2-Tier Repo Profile — chọn 1 lần khi onboarding, bỏ phân loại S/M/L theo task):**
| Hồ sơ | File sử dụng | Khi nào dùng |
| :--- | :--- | :--- |
| **Core** | `AGENTS.md`, `MAP.md`, `roles/`, `templates/{work,next-prompt}.md`, `work/<ID>-<slug>.md` | Repo nhỏ, ít task song song |
| **Scale-up** | Core + tùy chọn `CHECKPOINT.md`, `REUSE.md`, `INDEX.md`, `archive/`, `scripts/checkpoint.mjs` | Repo trung bình/lớn, nhiều module/task song song |

## 3. Cài khung & Tuỳ biến
- Copy theo hồ sơ đã chọn (**Core** hoặc **Scale-up**); thêm wrapper (`CLAUDE.md`, `.agents/rules/project.md`, `.agents/skills/*/SKILL.md`) nếu repo dùng nhiều tool.
- *(Tuỳ chọn)* Sync `token-guard` (loại trừ `config.json`, `.state/`, `__pycache__`), thêm `__pycache__/` và `*.pyc` vào `.gitignore`.
- Tuỳ biến: chọn **1 chuẩn nhánh thống nhất** cho cả repo (mặc định `work/<ID>-<slug>`, hoặc giữ chuẩn hiện có như `task/<ID>`), điền `MAP.md`, đặt Tiered Verification theo rủi ro (`T1/T2/T3`), project invariants, do-not-read list, legacy note, và approval gates.

## 4. Xác minh & Commit
- Kiểm tra sạch placeholder (`TODO`, tên nhánh mẫu không khớp), chạy T1 pass, kiểm tra `git status`.
- Gom commit trên nhánh tích hợp (hoặc PR theo branch protection), push và kiểm tra `HEAD == origin`.

## 5. Vận hành & Bảo trì
- **Luồng vận hành:** `Planner (work file) → Coder (code + T1/T2, ghi chứng cứ 5 trường) → Reviewer độc lập (đọc progressive, kiểm chứng cứ & verdict) → Planner (merge khi APPROVE, đóng task)`.
  - *Ngoại lệ Planner tự đóng:* chỉ áp dụng cho việc sửa doc/typo/index thuần túy (0 tác động code, test, config, hoặc workflow policy), ghi lý do 1 dòng trong Section B.
- **Work file SSOT (`docs/agent/work/<ID>-<slug>.md`):** giữ cấu trúc `front-matter / Section A (≤25 dòng) / Section B (append-only, mỗi entry mới ≤15 dòng và ≤150 từ)`. Đầu phiên đọc có chọn lọc: `front-matter + Section A + entry Section B cuối cùng`. `NEXT PROMPT` chỉ xuất trong chat.
- **Tái dùng chứng cứ test (5 trường: `sha`, `command`, `result`, `tier`, `env_note`):**
  - Coder `local` PASS trên đúng `sha` được tái dùng cho **T1/T2**.
  - **T3 rủi ro cao** (auth/security, DB migration, dependency/lockfile, build/CI, release) bắt buộc có **CI PASS đáng tin cậy** (đủ điều kiện môi trường) hoặc **Reviewer chạy độc lập**.
  - Commit chỉ sửa doc của Reviewer (chạm duy nhất `work/<ID>-<slug>.md`) **không** làm mất hiệu lực `sha` đã test trước đó.
- **`CHECKPOINT.md` (tùy chọn, Scale-up):** do Planner sở hữu, là **cache tiện lợi** (không phải SSOT), **chỉ cập nhật trên nhánh tích hợp sau merge** (qua commit/PR tuân thủ branch protection; cấm sửa trên nhánh `work/<ID>`). Phải có `checkpoint_sha`, `branch`, `generated_at`; đầu phiên kiểm tra `git merge-base --is-ancestor <checkpoint_sha> HEAD` trước khi đọc delta, nếu lệch/thiếu commit thì fallback về `MAP.md` + active work file.
- **Đánh giá pilot (tùy chọn, không ngưỡng cứng):** có thể tham khảo nhẹ `review_rounds` (đếm từ commit `[<ID>][reviewer]`) và log token thụ động nếu sẵn có không tốn công; không ép thu thập 3 chỉ số hay ghi token vào handoff.
- **Bảo trì:** định kỳ diff với template (**không** ghi đè `config.json` / `.state/`); rà lại `MAP.md` và `REUSE.md` (nếu dùng) sau mỗi 5–10 task.

## Mẫu prompt khởi động (cho repo mới)
> Khảo sát nhanh repo hiện tại (read-only: git branch/remote/status, `package.json` scripts, `docs/`, rule cũ nếu có) rồi đề xuất phương án áp dụng `blamag999/agent-workflow-template` (chọn Core/Scale-up và Full replace/Hybrid) theo hướng tối ưu token. Báo cáo ngắn gọn phương án trước khi thực hiện.
