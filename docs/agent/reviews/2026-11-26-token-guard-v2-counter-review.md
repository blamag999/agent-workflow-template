# Independent Counter-Review — Token Guard v2.0.0 / v2.1 Lite Proposal

- **Date:** 2026-11-26
- **Role:** Independent Counter-Reviewer
- **Repository:** `blamag999/agent-workflow-template`
- **Branch:** `proposal/token-optimization`
- **Reviewed Commit:** `ad156eefb6468292dfe75b7cad87a08ab027f754`
- **Reviewed Document:** `docs/agent/reviews/2026-11-26-token-guard-v2-review.md`
- **Verdict:** **HOLD MERGE** — Đồng thuận hướng **Token Guard v2.1 Lite (rút gọn hơn nữa)**; hạ mức độ rủi ro ở một số finding sau khi kiểm chứng mã nguồn và `transcript.jsonl` thực tế.
- **Impact on Lean Agent Workflow v2 pilot:** **NONE** — Giữ Token Guard hoàn toàn độc lập với Lean Agent Workflow v2 đã duyệt pilot. Không sửa mã plugin ở vòng phản biện này.

---

## 1. Bảng phản biện TG01–TG07 (AGREE / MODIFY / DISAGREE)

| ID | Mức độ (Review gốc) | Phản biện | Mức độ đề xuất | Tóm tắt bằng chứng & lý do |
|---|---|---|---|---|
| **TG01** | HIGH | **AGREE** | **HIGH** | `config.json:6`, `token_tracker.py:15,384,430-443`, `SKILL.md:59-70` đặt mặc định `auto_handoff_and_new_chat` và gọi `ConversationService/CreateConversation` tự động khi vượt ngưỡng. Đúng là không an toàn làm mặc định. **Lưu ý:** chỉ đổi mặc định sang `suggest` (opt-in cho auto), **không** thêm bộ kiểm tra role/task-state của Lean v2 vào plugin để giữ độc lập. |
| **TG02** | HIGH | **AGREE** | **MEDIUM** | `token_tracker.py:145-147` tính `avg_delta = round(last_context / turns)` rồi `est_turns_left = remaining // avg_delta`. Sai về mặt toán học (trộn system prompt lượt đầu vào tốc độ tăng và hỏng sau `/compact`). Hạ xuống MEDIUM vì là lỗi hiển thị gây hiểu nhầm, không gây mất dữ liệu. Đề xuất **xóa hẳn** `est_turns_left`, không cần xây thuật toán dự báo mới. |
| **TG03** | HIGH | **MODIFY** | **LOW** | **Đã kiểm chứng thực tế trên 3 file `transcript.jsonl` của Antigravity** (xem Mục 2): `input_tokens` và `cache_read_tokens` là **rời nhau (disjoint)** — công thức `current_context = inp + cache` **KHÔNG bị đếm trùng**. Việc còn lại chỉ là tách 1 helper dùng chung giữa `parse_transcript` (`L135-142`) và `compute_window_usage` (`L276-280`), kèm fixture test và nhãn rõ cho `total_tokens` (gộp cả cached reads, không phải billed quota). |
| **TG04** | MEDIUM | **MODIFY** | **LOW** | `scan_recent_sessions` (`L194-220`) đọc tối đa 10 file và `compute_window_usage` (`L238-296`) đã có cache TTL 10s. Chỉ cần thêm 1 dict cache in-memory theo `(path, mtime_ns, size)` (~10 dòng) trong `parse_transcript`. **Không** làm incremental byte-offset parser hay cơ chế lazy-loading phức tạp khi chưa có số đo nghẽn cổ chai. |
| **TG05** | MEDIUM | **AGREE** | **MEDIUM** | `token_tracker.py:365-375` hiển thị `Token: {ctx:,} / {crit:,} ({pct}%)` dễ bị hiểu nhầm là giới hạn context window của model hoặc quota tài khoản. Chỉ cần sửa nhãn text cho trung thực (`Ngữ cảnh` / `Ngưỡng cảnh báo` / `Local 5h/7d`), không cần thêm cấu trúc UI mới. |
| **TG06** | MEDIUM | **MODIFY** | **LOW** | `scripts/install-token-guard.ps1:13-22` **đã có sẵn** logic backup & khôi phục `config.json` (trừ khi truyền `-Force`). Review gốc bỏ sót điểm này. Chỉ cần bổ sung hướng dẫn tải-kiểm tra-chạy trong README và tùy chọn `-Ref <tag|sha>` nếu muốn pin phiên bản; **không** xây installer framework/rollback phức tạp. |
| **TG07** | MEDIUM | **MODIFY** | **LOW (tách riêng)** | `extras/web-token-guard.user.js:56-60` (fallback `main.innerText`) và `L79` (`input.textContent = text` ghi đè nháp không hỏi) là lỗi thật. Tuy nhiên cần **tách hẳn** userscript khỏi release gate của Token Guard v2.1 Lite (xử lý ở PR/patch độc lập) để không buộc bảo trì DOM ChatGPT/Claude vào vòng phát hành plugin Antigravity. |

---

## 2. Kiểm chứng tính chính xác: Token, Cached Tokens & Auto-Handoff

### 2.1. Kiểm chứng thực nghiệm `input_tokens` và `cache_read_tokens` (Trả lời Q1)
Kiểm tra trực tiếp 3 file `transcript.jsonl` thực tế tại `~/.gemini/antigravity/brain/*/.system_generated/logs/transcript.jsonl` (`PLANNER_RESPONSE`):

- **Phiên `de520390`** (4 lượt đầu):
  - Turn 1: `input_tokens = 14,925`, `cache_read_tokens = 0` → `inp + cache = 14,925`
  - Turn 2: `input_tokens = 2,679`, `cache_read_tokens = 12,868` → `inp + cache = 15,547` (+622)
  - Turn 3: `input_tokens = 2,914`, `cache_read_tokens = 13,498` → `inp + cache = 16,412` (+865)
  - Turn 4: `input_tokens = 2,326`, `cache_read_tokens = 14,555` → `inp + cache = 16,881` (+469)
- **Phiên `ab1ca130`** (4 lượt đầu):
  - Turn 3: `input_tokens = 11,026`, `cache_read_tokens = 13,519` → `inp + cache = 24,545`
  - Turn 4: `input_tokens = 6,114`, `cache_read_tokens = 24,546` → `cache_read_tokens` của Turn 4 bằng chính tổng `inp + cache` của Turn 3 (+1), chứng minh tuyệt đối **`input_tokens` và `cache_read_tokens` là 2 đại lượng rời nhau (disjoint)**.

**Kết luận kỹ thuật:**
1. `current_context = input_tokens + cache_read_tokens` là **chính xác** cho kích thước ngữ cảnh thực tế của lượt gần nhất.
2. `total_tokens += input_tokens + cache_read_tokens + output_tokens` phản ánh **tổng khối lượng token đã đi qua mô hình (gross volume)**, không phải **billed tokens** (do cache read thường được giảm giá) và không phải **quota tài khoản chính thức**. Cần ghi nhãn rõ thay vì đổi công thức thành trừ cache.
3. Không cần xây cơ chế dò schema đa-provider hay trạng thái `unknown` phức tạp; chỉ cần chuẩn hóa vào 1 hàm helper duy nhất (`_extract_turn_usage`) và xử lý an toàn khi thiếu field (`None` / non-int).

### 2.2. Kiểm tra cơ chế `auto-handoff` (Trả lời Q2 & Q6)
- Trong `token_tracker.py:427-443`, khi `ctx >= crit` và `mode` là `auto_handoff_and_new_chat` (mặc định), hook `PreInvocation` chèn trực tiếp `[TOKEN_GUARD_AUTO_HANDOFF]` kèm lệnh gọi `ConversationService/CreateConversation`.
- `rules/AGENTS.md:4` ép agent thực thi ngay trong lượt đó.
- **Rủi ro thực tế:**
  1. Cắt ngang tác vụ đang chạy dở (đặc biệt khi đang edit code hoặc review độc lập).
  2. Phụ thuộc endpoint nội bộ chưa được công bố chính thức (`$ANTIGRAVITY_LS_ADDRESS/product.v1.ConversationService/CreateConversation`).
- **Quyết định:**
  - Đặt mặc định `red_threshold_mode = "suggest"`.
  - Không thiết kế "narrower safe auto-mode" (sẽ phải đọc trạng thái git/Lean work file → phá vỡ nguyên tắc độc lập với Lean v2).
  - Với `CreateConversation` (Q6): chỉ giữ ở mức hướng dẫn/hành động thủ công khi người dùng chủ động yêu cầu, kèm fallback hướng dẫn mở phiên mới thủ công nếu endpoint lỗi.

---

## 3. Đánh giá tính cần thiết & Tránh phát sinh công cụ/quy trình thừa

| Đề xuất trong v2.1 Lite | Cần thiết? | Đánh giá tránh phình phạm vi |
|---|---|---|
| Đổi mặc định `red_threshold_mode` → `suggest` | **Bắt buộc (P0)** | Sửa 2 dòng config/default, loại bỏ rủi ro lớn nhất. |
| Xóa `est_turns_left` (Q3) | **Bắt buộc (P0)** | Xóa code sai thay vì viết bộ dự báo mới. Giữ `delta_tokens` là đủ. |
| Tách helper tính token + sửa nhãn (TG03, TG05) | **Nên làm (P1)** | Chỉ gom 1 helper + đổi chuỗi nhãn. Không thêm schema detector hay collapsible panel mới (Q5: giữ 5h/7d nhưng gắn nhãn `(local)`). |
| Cache `(path, mtime_ns, size)` cho `parse_transcript` (Q4) | **Tùy chọn nhẹ (P1)** | ~10 dòng code, an toàn, không cần incremental offset parser. |
| Cập nhật README installer + kiểm tra `install-token-guard.sh` | **Nhẹ (P1)** | Không tạo installer framework hay cơ chế rollback phức tạp. |
| Sửa `extras/web-token-guard.user.js` (Q7) | **Tách riêng (P2 / PR khác)** | Không gắn vào release gate của Antigravity plugin. |
| Kiểm tra trạng thái Lean v2 work file trong hook | **LOẠI BỎ (OUT)** | Giữ Token Guard độc lập tuyệt đối với Lean Agent Workflow v2. |

---

## 4. Phạm vi sửa tối thiểu đề xuất (Minimal Patch Scope)

Chỉ áp dụng sau khi Planner chốt task card (không sửa ở vòng này):

1. **`config.json` & `scripts/token_tracker.py`:**
   - Đổi `red_threshold_mode` mặc định thành `"suggest"`.
   - Xóa `est_turns_left` / `avg_delta` khỏi hiển thị mặc định (hoặc bỏ hẳn khỏi payload nếu UI không bắt buộc).
   - Gom logic đọc `input_tokens`, `cache_read_tokens`, `output_tokens` vào 1 helper dùng chung cho `parse_transcript` và `compute_window_usage`.
   - Thêm in-memory cache theo `(path, mtime_ns, size)` trong `parse_transcript`.
   - Cập nhật nhãn status bar trong `build_status_line` cho rõ `Ngữ cảnh` vs `Ngưỡng cảnh báo` và `Tổng phiên (local)`.
2. **`rules/AGENTS.md` & `skills/token-guard/SKILL.md`:**
   - Giữ quy tắc ngắn gọn; nhấn mạnh `CreateConversation` chỉ chạy khi người dùng chủ động yêu cầu (hoặc bật opt-in) và có fallback thủ công nếu gọi API thất bại.
3. **`README.md` (nhánh plugin):**
   - Bổ sung lệnh tải-kiểm tra-chạy thay vì chỉ có `irm | iex` / `curl | bash`.
4. **Ngoài phạm vi patch này (tách PR riêng):** `extras/web-token-guard.user.js` (chặn ghi đè draft khi composer đang có chữ + bỏ fallback `main.innerText`).

---

## 5. Ma trận Test bắt buộc (Minimal Mandatory Tests)

Không cần benchmark phức tạp; chỉ yêu cầu bộ test tự động nhỏ, chạy nhanh bằng `pytest` hoặc `unittest` (zero-dependency):

1. **T1 — Default safety (TG01):** Với config mặc định (`suggest`), khi `current_context >= critical_threshold`, `build_hook_message` **không** được chứa `[TOKEN_GUARD_AUTO_HANDOFF]` và **không** yêu cầu `CreateConversation`.
2. **T2 — Disjoint cache & edge cases (TG03):** Fixture `transcript.jsonl` mô phỏng Antigravity thật (`input_tokens` + `cache_read_tokens` rời nhau), dòng JSON lỗi, field `None`/thiếu → `parse_transcript` và `compute_window_usage` cho kết quả nhất quán, không crash.
3. **T3 — Compaction / non-monotonic context (TG02):** Fixture có ngữ cảnh giảm đột ngột (sau `/compact`) → `delta_tokens` phản ánh đúng biến thiên gần nhất, không phát sinh dự báo `est_turns_left` sai lệch.
4. **T4 — Cache hit on unchanged file (TG04):** Gọi `parse_transcript` 2 lần trên cùng file không đổi `mtime`/`size` → không đọc lại đĩa (xác minh qua mock/counter).
5. **T5 — Installer config preservation (TG06):** Smoke test kiểm tra `install-token-guard.ps1` / `.sh` giữ nguyên `config.json` hiện có khi không truyền `-Force`.

---

**Trạng thái:** **HOLD MERGE.** Chờ Planner tổng hợp kết quả đồng thuận để tạo task card tối thiểu cho Token Guard v2.1 Lite. Lean Agent Workflow v2 pilot không bị ảnh hưởng.
