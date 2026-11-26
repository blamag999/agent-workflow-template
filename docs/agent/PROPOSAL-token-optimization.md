# Đề xuất: Lean Agent Workflow v2 (Tối ưu Token & Trình bày Markdown)

> **Status: APPROVED FOR PILOT (candidate `376fe82` — 6/6 Reviewer Convergence; HOLD MERGE vào `main`)**

**TL;DR:** Chọn hồ sơ **Core / Scale-up** 1 lần khi cài repo · Work file SSOT (`front-matter / Section A ≤25 dòng / Section B` entry ≤15 dòng & ≤150 từ) · Đọc ngữ cảnh tăng tiến (*progressive context*) · Kiểm thử rủi ro `T1/T2/T3` + tái dùng chứng cứ 5 trường · `CHECKPOINT.md` tùy chọn, chỉ cập nhật trên nhánh tích hợp sau merge.

## 1. Luồng tổng
`Planner (work file) → Coder (code + chứng cứ 5 trường) → Reviewer độc lập (progressive context + kiểm chứng cứ) → Planner (merge khi APPROVE) → [Tùy chọn] Cập nhật CHECKPOINT.md trên nhánh tích hợp`

- Mỗi task = 1 nhánh thống nhất theo chuẩn repo (mặc định `work/<ID>-<slug>`) = 1 work file `docs/agent/work/<ID>-<slug>.md`.
- **Ngoại lệ Planner tự đóng:** chỉ áp dụng cho sửa doc/typo/index thuần túy (0 tác động code, test, config, hoặc workflow policy), ghi lý do 1 dòng vào `Section B`. Mọi thay đổi khác giữ nguyên Reviewer độc lập.
- Giới hạn **tối đa 3 vòng review** là ngưỡng leo thang để Planner quyết định, **không** phải tự động chấp thuận lỗi còn tồn đọng.

## 2. Ước lượng token nạp ngữ cảnh (Chưa kiểm chứng thực tế)
> [!NOTE]
> Các con số dưới đây là **ước lượng minh họa chưa kiểm chứng** (*unverified illustrative estimates*), không phải số đo thực nghiệm và không dùng để tuyên bố % tiết kiệm.

| Cách nạp đầu phiên | Ước lượng minh họa | Trạng thái đo |
| :--- | :--- | :--- |
| Đọc cả repo | ~150k | *unverified estimate* |
| Docs + grep rộng | ~40k | *unverified estimate* |
| `CHECKPOINT.md` + diff | ~8k | *unverified estimate* |
| Dòng trạng thái L1 | ~0.1k | *unverified estimate* |

- **Nguyên tắc đo (F02):** Chỉ ghi nhận token thực tế bằng **passive measurement** từ log usage sẵn có của host/provider (Codex/API) nếu không tốn thêm thao tác/lệnh cho agent; nếu không có log tin cậy thì ghi `*unmeasured*`. `token-guard` chỉ ước lượng kích thước text/context và **không** được báo cáo như token sử dụng thực tế của phiên agent trừ khi có dữ liệu provider xác thực.

## 3. Hồ sơ repo & Work file SSOT (`docs/agent/work/<ID>-<slug>.md`)
### Chọn hồ sơ 1 lần khi cài repo (bỏ S/M/L theo từng task)
- **Core** *(mặc định cho repo nhỏ/mới)*: `AGENTS.md` + `MAP.md` + `roles/` + `templates/{work,next-prompt}.md` + `work/<ID>-<slug>.md`.
- **Scale-up** *(repo trung bình/lớn nhiều task song song)*: Core + tùy chọn `CHECKPOINT.md`, `REUSE.md`, `INDEX.md`, `archive/`, `scripts/checkpoint.mjs`.
- **Hybrid migration:** giữ nguyên luồng cũ cho task đang chạy dở (không tự động ghi đè file đang hoạt động), xác định rõ ranh giới áp dụng cho task mới, và bảo toàn mọi approval gate hiện hành.

### Cấu trúc chuẩn Work file (`front-matter / Section A / Section B`)
- **Front-matter:** `work`, `title`, `branch`, `base_sha`, `phase`, `next_role`, `round`.
- **Section A (≤25 dòng, ghi đè mỗi phiên):** `Goal`, `Scope`, `Entry points`, `Reuse`, `Acceptance criteria`, `Verify (task)`, `Verify (gate)`, `Next task (3–5 bullets)`, `Read next (max 5)`. Không nhân bản `NEXT PROMPT` vào Section A.
- **Section B (append-only, cấm sửa entry cũ):** mỗi entry mới **≤15 dòng VÀ ≤150 từ**. Đầu phiên chỉ đọc phần cuối (*tail-read*): `front-matter + Section A + entry Section B cuối cùng` (chỉ mở lịch sử cũ khi thật sự cần).
- **Không bắt buộc tạo thêm** file `DELIVERY`/`REVIEW`/`ACCEPTANCE` riêng cho từng task (chỉ dùng báo cáo rời nếu task có yêu cầu audit/tuân thủ đặc biệt).

## 4. Đọc ngữ cảnh tăng tiến, Code & Tái dùng chứng cứ test
- **Progressive context (chống bẫy "chỉ đọc diff"):** Đọc theo thứ tự `CHECKPOINT.md` (nếu có và hợp lệ) → `AGENTS.md` → `roles/<role>.md` → work file (tail-read) → `Read next`. Xem `git diff --stat` trước để định hướng, nhưng **chủ động mở rộng sang caller, contract, test và invariant liên quan khi cần** — không bao giờ coi việc chỉ đọc diff là đủ để kết luận tính đúng đắn.
- **Khi code:** Giới hạn ~300 dòng/module chỉ là **tín hiệu tham khảo (hotspot signal)**, không ép tách file máy móc; `REUSE.md` là tùy chọn (Scale-up), chỉ cập nhật khi thêm/sửa helper dùng chung thật sự.
- **Kiểm thử theo rủi ro (`T1/T2/T3`) & Tái dùng chứng cứ 5 trường:**
  - Ghi chứng cứ test trong `Section B` (1–2 dòng) gồm 5 trường: `sha` (commit code/config/test đã chạy), `command`, `result` (`PASS N/N`), `tier` (`T1|T2|T3`), `env_note` (`local`, `CI <url>`, hoặc ghi chú DB/env khác mặc định).
  - **Coder local PASS** trên đúng `sha` được tái dùng cho **T1 / T2**.
  - **T3 rủi ro cao** (auth/security, DB schema/migration, nâng cấp dependency/lockfile, cấu hình build/CI, release) bắt buộc có **CI PASS đáng tin cậy** (đủ điều kiện môi trường) hoặc **Reviewer chạy độc lập**.
  - Commit chỉ sửa tài liệu của Reviewer (chạm duy nhất `work/<ID>-<slug>.md`) **không** làm mất hiệu lực `sha` đã test trước đó; mọi sửa đổi code/test/config/lockfile/môi trường đều làm mất hiệu lực tái dùng.

## 5. Event-based Checkpoint (Tùy chọn cho Scale-up)
- `CHECKPOINT.md` là **cache tiện lợi** (không phải nguồn sự thật; Git `HEAD`/`git log`, `work/<ID>-<slug>.md` và `MAP.md` luôn là SSOT). Không bắt buộc lưu định kỳ `checkpoints/YYYY-MM-DD.md`; `scripts/checkpoint.mjs` là tùy chọn.
- **Quyền sở hữu & nhánh (B4):** `CHECKPOINT.md` do **Planner sở hữu** và **chỉ cập nhật trên nhánh tích hợp sau khi merge** (hoặc mốc kiến trúc lớn trên nhánh tích hợp). **Cấm sửa `CHECKPOINT.md` trên nhánh `work/<ID>`** để tránh xung đột khi chạy song song. Nếu nhánh tích hợp bật branch protection, Planner cập nhật qua commit/PR bình thường sau merge (không bypass protection).
- **An toàn provenance & fallback (F01):** `CHECKPOINT.md` phải ghi `checkpoint_sha` (commit SHA trên nhánh tích hợp mà checkpoint phản ánh, phân biệt với `HEAD` đang dở trên nhánh `work/<ID>`), `branch`, `generated_at`. Khi `checkpoint_sha ≠ HEAD`, kiểm tra quan hệ tổ tiên bằng `git merge-base --is-ancestor <checkpoint_sha> HEAD`:
  - Nếu là ancestor: dùng `git log --oneline <checkpoint_sha>..HEAD` và `git diff --stat <checkpoint_sha>..HEAD` làm dẫn đường.
  - Nếu rẽ nhánh/rebase/thiếu commit: **fallback** về `MAP.md` + active work file + kiểm tra có phạm vi; không coi diff sai lệch là đáng tin.

## 6. Trình bày 3 mức (L1 / L2 / L3)
| Mức | Dùng khi | Ví dụ |
| :--- | :--- | :--- |
| **L1** | Đầu phiên, cuối lượt | `🟢 test@f4aac47 · T1 13/13 · 1 hold (E26) · next: review E26` |
| **L2** | Đánh giá nhanh repo | `CHECKPOINT.md` ≤40 dòng (khi repo dùng Scale-up) |
| **L3** | Đào sâu 1 task | Work file, `git diff`, log chi tiết |

## 7. Ranh giới SSOT & Quy chuẩn file trong repo (F03)
| File | Trách nhiệm duy nhất (SSOT) | Quy chuẩn |
| :--- | :--- | :--- |
| `AGENTS.md` | Luật chung & hợp đồng vai trò | Ngắn gọn, ổn định |
| `MAP.md` | Vị trí thư mục / module | Cây/bảng đường dẫn + 1 dòng vai trò |
| `work/<ID>-<slug>.md` | Trạng thái & lịch sử 1 task | `front-matter`, `Section A ≤25 dòng`, `Section B` entry `≤15 dòng & ≤150 từ` |
| `INDEX.md` | Danh sách task đã đóng | 1 dòng / task hoàn tất (tùy chọn ở Core) |
| `CHECKPOINT.md` | Cache tổng quan repo (tùy chọn) | ≤40 dòng, integration-branch-only, đủ F01 provenance |
| `REUSE.md` | Entry point dùng chung (tùy chọn) | `Tên \| Đường dẫn \| 1 dòng` |
| `archive/` | Lưu work file đã đóng | Chuyển vào khi `phase: DONE` |

## 8. Lộ trình pilot
`1. Cập nhật AGENTS.md, ADOPT.md, PROPOSAL, roles/ & templates/ trên nhánh proposal/token-optimization (DONE) → 2. Reviewer kiểm tra lần cuối (APPROVE FOR PILOT @ 376fe82) → 3. Pilot 3–5 task thực tế trên my-learning-hub (NEXT) → 4. Tổng kết trước khi xét merge vào main (HOLD MERGE)`

- **Reviewer sign-off (2026-11-26):** `APPROVE FOR PILOT` trên candidate `376fe82` — 6/6 Convergence Checklist đạt, 3 yêu cầu sửa cuối PASS, không còn blocker/major. Giữ `HOLD MERGE` vào `main` và không deploy cho đến khi hoàn tất đánh giá pilot.

## 9. Phản biện, Rủi ro & Tiêu chí đánh giá Pilot
- **Checkpoint lệch thực tế (F01):** SHA lệch `HEAD` chỉ báo hiệu có delta, không đồng nghĩa hỏng; luôn chạy `git merge-base --is-ancestor` trước, nếu divergent thì fallback về `MAP.md` + work file.
- **Giới hạn module ≤300 dòng:** Chỉ là tín hiệu cảnh báo hotspot, không phải luật cứng ép tách file.
- **Chi phí bảo trì:** Việc Planner cập nhật `CHECKPOINT.md` sau merge có chi phí ước tính nhẹ (chưa đo, *unverified estimate* ~1–2k token/lần) và hoàn toàn tùy chọn ở hồ sơ Core.
- **Đánh giá Pilot (3–5 task thực tế — không rào cản đo đạc nặng):**
  - Đánh giá dựa trên: (1) **không bỏ sót gate bắt buộc**, (2) **chất lượng nghiệm thu** đạt chuẩn, và (3) **độ ma sát vận hành thấp**.
  - **Chỉ số nhẹ tùy chọn:** có thể tham khảo `review_rounds` (đếm thụ động từ commit gắn tag `[<ID>][reviewer]`), **không** đặt ngưỡng cứng, **không** bắt buộc thu thập 3 chỉ số hay ghi token vào handoff.
  - **Điều kiện dừng / hoàn nguyên:** dừng hoặc revert nếu có dấu hiệu bỏ qua review/gate thiết yếu, lịch sử task trở nên mơ hồ, hoặc chi phí phối hợp tăng rõ rệt.
