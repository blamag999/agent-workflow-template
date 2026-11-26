# Independent Counter-Review — Token Guard Web Userscript Repair Design

- **Date:** 2026-11-26
- **Role:** Independent Counter-Reviewer
- **Repository:** `blamag999/agent-workflow-template`
- **Branch:** `proposal/token-optimization`
- **Reviewed Commit:** `f941bef95b0ea1539f1390fa2acff0a76cc547dc`
- **Reviewed Documents:**
  - `docs/agent/reviews/2026-11-26-token-guard-web-design-for-counter-review.md`
  - `docs/agent/tasks/TG-21.md`
  - `extras/web-token-guard.user.js` (v2.0.0)
- **Verdict:** **APPROVE WITH MODIFICATIONS (W4, W5)** — Đủ cơ sở để Planner chốt `TG-21.md` cho Coder triển khai hợp nhất cả plugin Antigravity (TG01–TG06) và userscript Web (TG07) trong một lượt.
- **Scope Guard:** Không sửa mã plugin/userscript ở vòng này. **HOLD MERGE. Không deploy.** Giữ Token Guard độc lập với Lean Agent Workflow v2.

---

## 0. Lỗi nghiêm trọng phát hiện thêm khi đọc mã `extras/web-token-guard.user.js`

Ngoài các rủi ro đã nêu trong báo cáo thiết kế, kiểm tra trực tiếp `extras/web-token-guard.user.js` cho thấy 2 lỗi thực tế cần chốt vào test hồi quy:
1. **Lỗi bỏ sót toàn bộ câu trả lời của Claude (`L43–54`):** Vòng lặp `for (const sel of selectors)` có lệnh `break` ngay ở selector đầu tiên khớp (`[data-testid="user-message"]`). Khi phiên Claude có ít nhất 1 tin nhắn người dùng, script **dừng ngay và bỏ qua hoàn toàn** `.font-claude-message` (toàn bộ phản hồi của Claude).
2. **Thiếu singleton guard (`L90–139`) & chạy nền khi tab ẩn (`L194–203`):** Không kiểm tra `document.getElementById('tg-web-root')` trước khi gắn DOM/observer, và `setInterval(refresh, 4000)` chạy vĩnh viễn kể cả khi `document.hidden === true`.

---

## 1. Phản biện W1–W6 (AGREE / MODIFY / DISAGREE)

| ID | Phản biện | Phân tích & điều chỉnh tối giản |
|---|---|---|
| **W1 — Message adapters** | **AGREE** | Tách `getChatGPTMessages()` và `getClaudeMessages()`. **Bắt buộc** gom cả selector user + assistant trong cùng adapter (không dùng kiểu `for ... break` làm rơi tin nhắn assistant trên Claude như v2.0.0). Loại bỏ `main [class*="message"]`. |
| **W2 — Dedup and fallback** | **AGREE** | Dedup theo `Set` + loại node con bị chứa bởi node cha đã chọn (`!nodes.some(p => p !== n && p.contains(n))`). **Xóa hẳn** fallback `main.innerText` (`L56–60`). Khi không khớp selector nào, trả về trạng thái `unavailable` (`Chưa nhận diện DOM`) thay vì đếm cả trang. |
| **W3 — Metric semantics** | **AGREE** | Giữ ước lượng nhẹ theo ký tự (`~N`), **không** thêm thư viện tokenizer. Hiển thị rõ `Ước lượng văn bản hiển thị · chưa gồm file/ảnh/context ẩn`. Giữ thanh tiến trình + `%` nhưng đổi nhãn tường minh thành `% ngưỡng cảnh báo` (ví dụ `~12.4k / ngưỡng 120k`). |
| **W4 — Draft-safe actions** | **MODIFY** | **Bỏ hẳn nút `Chèn prompt` (`fillPrompt`)**, chỉ giữ duy nhất 1 nút chính **`Copy prompt Handoff`** dùng `await navigator.clipboard.writeText(...)` với trạng thái thật (`Đã copy!` / `Copy thất bại — hãy copy thủ công`). Lý do: ProseMirror/React trên ChatGPT và Claude đổi DOM liên tục, thao tác ghi trực tiếp `textContent`/`InputEvent` rất dễ lệch state hoặc hỏng nháp; copy-only an toàn 100% với bản nháp, gọn hơn ~25 dòng code, người dùng chỉ cần `Ctrl+V`. |
| **W5 — SPA / mutations** | **MODIFY** | **Bỏ `setInterval(refresh, 4000)` quét DOM định kỳ.** Chỉ dùng **1 `MutationObserver` có debounce (~1500–2000ms)** gắn vào `main` (fallback `document.body`), bỏ qua mutation thuộc `#tg-web-root`, và **không quét khi `document.hidden === true`**. Xử lý đổi route SPA bằng theo dõi `lastHref !== location.href` qua `popstate`, `visibilitychange`, và kiểm tra URL nhẹ trong callback/wrapper `history.pushState`/`replaceState` (chỉ reset & quét lại khi URL đổi). Thêm singleton guard `#tg-web-root`. |
| **W6 — Privacy + scope** | **AGREE** | Chỉ đọc DOM cục bộ, không gọi mạng (`fetch`/`XHR`/`sendBeacon`), không lưu nội dung chat vào `localStorage` (chỉ lưu `{ warn, crit, expanded }`). Giữ `@grant none` và 1 file userscript duy nhất, không phụ thuộc thư viện ngoài hay Lean v2. |

---

## 2. Trả lời 6 câu hỏi trong báo cáo thiết kế

1. **Q1 (W1/W2 — Selector & fallback):**
   - Selector top-level theo từng nền tảng (gom **cả user và assistant** trong cùng lượt truy vấn, không `break` ở selector user) kết hợp lọc lồng nhau (`ancestor.contains(descendant)`) là **đủ tốt và chính xác hơn** so với chỉ bám container lượt thoại (vốn hay dính nút Copy/Regenerate/nhãn model).
   - Fallback an toàn: trả về `{ status: 'unavailable', tokens: null, turns: 0 }` và hiển thị `Chưa nhận diện DOM` (tuyệt đối không fallback `main.innerText`).
2. **Q2 (W3 — Ước lượng token vs số ký tự, giữ thanh tiến trình?):**
   - **Giữ ước lượng `~N` token** kèm ghi chú tường minh (`Ước lượng văn bản hiển thị · chưa gồm file/ảnh/ngữ cảnh ẩn`), không đổi sang hiển thị thuần số ký tự vì người dùng so sánh trực tiếp với ngưỡng cảnh báo dạng token (`80k`/`120k`).
   - **Giữ** thanh tiến trình nhỏ và `%`, nhưng gắn nhãn rõ là `% ngưỡng cảnh báo` để không nhầm với context window thực của model.
3. **Q3 (W4 — Bỏ Insert hay giữ Insert cho ô trống?):**
   - **Chọn phương án 1: Loại bỏ hẳn `Insert` (`fillPrompt`), chỉ giữ `Copy prompt Handoff`.** Đây là lựa chọn đơn giản nhất, bền nhất trước thay đổi UI của ChatGPT/Claude và đảm bảo tuyệt đối không bao giờ ghi đè hay làm hỏng bản nháp.
4. **Q4 (W5 — Interval 4s + Observer hay event-driven?):**
   - **Bỏ `setInterval` 4s quét DOM.** Dùng 1 `MutationObserver` có debounce + cơ chế bắt đổi route SPA (`popstate` + `visibilitychange` + `lastHref` check / `pushState`/`replaceState` hook nhẹ) + tạm dừng khi `document.hidden === true`. Đủ bao phủ SPA và streaming mà gần như 0 CPU khi nhàn rỗi.
5. **Q5 (W6 — `@grant none`, `localStorage`, clipboard & giới hạn riêng tư):**
   - Chấp nhận được với `@grant none` vì `localStorage` chỉ lưu cấu hình ngưỡng (`warn`, `crit`, `expanded`) và `navigator.clipboard.writeText` chạy trong click handler trên HTTPS.
   - Giới hạn cần ghi chú ngắn trong README/header: (a) `localStorage` tách biệt theo từng origin (`chatgpt.com` và `claude.ai` không đồng bộ cấu hình và cùng origin với trang web), (b) clipboard có thể bị từ chối quyền bởi trình duyệt → UI báo lỗi trung thực thay vì báo thành công giả.
6. **Q6 (Release gate — T6–T8 tự động vs T9 `NOT RUN`):**
   - **ĐỒNG Ý.** Bộ test fixture tự động **T6–T8** là đủ để duyệt hoàn thành code của **TG-21 trên nhánh làm việc** khi môi trường agent không có phiên đăng nhập ChatGPT/Claude thực để chạy **T9**, **với điều kiện bắt buộc**: báo cáo nghiệm thu phải ghi rõ `T9: NOT RUN` và gắn nhãn **Web compatibility: UNVERIFIED — cần manual UAT trước khi phát hành / merge vào `main`**.

---

## 3. Phương án tối giản nhất đề xuất cho `extras/web-token-guard.user.js`

- **Trích xuất:** `getChatGPTMessages()` + `getClaudeMessages()` (gom cả user & assistant) → `dedupeTopLevel(nodes)` → tính `Math.round(totalChars / 3.8)`; 0 node khớp → `status: 'unavailable'`.
- **Hành động:** 1 nút chính **`Copy prompt Handoff`** (`async` clipboard + báo thành công/thất bại thật). Xóa `fillPrompt` và nút `Chèn prompt`.
- **Hiệu năng & SPA:** Singleton guard `#tg-web-root` + 1 `MutationObserver` (debounce 1500ms, bỏ qua `#tg-web-root` và `document.hidden`) + reset khi `location.href` đổi (không dùng `setInterval` 4s quét DOM).
- **Hiển thị:** Pill/card giữ gọn như cũ, đổi nhãn tường minh (`~12.4k / ngưỡng 120k (10%)`, `Ước lượng văn bản hiển thị · N khối · chưa gồm file/ảnh/ngữ cảnh ẩn`, hoặc `Chưa nhận diện DOM`).

---

## 4. Chốt ma trận kiểm thử T6–T9 & Điều kiện nghiệm thu thực tế

- **T6 — DOM extraction & regression:** Fixture tổng hợp cho ChatGPT và Claude gồm:
  - Phiên Claude có **cả** `[data-testid="user-message"]` và `.font-claude-message` (regression test cho lỗi `break` ở v2.0.0 — bắt buộc đếm cả hai).
  - Node lồng nhau (ancestor/descendant) & selector trùng → không đếm trùng.
  - Text sidebar/navigation ngoài hội thoại → bị loại trừ.
  - DOM không khớp selector nào → trả về `unavailable`, **không** đếm `main.innerText`.
- **T7 — SPA, streaming & resource guard:**
  - Chuyển `location.href` giữa 2 hội thoại → reset số liệu cũ, cập nhật số liệu mới.
  - Mutation liên tiếp khi streaming → gom debounce, không quét dồn dập.
  - Mutation bên trong `#tg-web-root` hoặc khi `document.hidden === true` → không kích hoạt vòng lặp quét lại.
  - Khởi chạy lại script trên cùng trang → singleton guard ngăn tạo observer thứ hai.
- **T8 — Clipboard, draft safety & privacy:**
  - `navigator.clipboard.writeText` resolve → hiển thị thành công; reject hoặc thiếu `navigator.clipboard` → hiển thị lỗi thật.
  - Không can thiệp DOM composer (bản nháp người dùng bất biến 100%).
  - Quét mã nguồn xác nhận không có `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` hay lưu nội dung chat vào `localStorage`.
- **T9 — Live browser smoke (Manual UAT gate trước khi release/merge `main`):**
  - Chạy thực tế trên `chatgpt.com` và `claude.ai`: tải script, đếm tin nhắn user+assistant, đổi hội thoại SPA, copy prompt, kiểm tra nhãn ngưỡng.
  - Ghi rõ ngày, trình duyệt, kết quả (không kèm bí mật/nội dung chat thật). Nếu môi trường agent không truy cập được → ghi `NOT RUN` và giữ cờ **HOLD MERGE vào `main`** cho đến khi có UAT thủ công.

---

**Bàn giao:** Independent Counter-Reviewer → **Planner** cập nhật nhanh mục Web trong `docs/agent/tasks/TG-21.md` (áp dụng W4 copy-only & W5 bỏ `setInterval` 4s), rồi mở quyền cho **Coder** triển khai hợp nhất TG-21 (Plugin TG01–TG06 + Web TG07) trong một lượt với kiểm thử T1–T9. **HOLD MERGE. Không deploy.**
