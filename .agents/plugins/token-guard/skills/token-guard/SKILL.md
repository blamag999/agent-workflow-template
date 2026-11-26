---
name: token-guard
description: >-
  Kiểm tra số lượng token local realtime từ transcript, mở Side Pane Token Guard,
  cảnh báo theo ngưỡng cấu hình (mặc định `suggest`) và lưu ngữ cảnh (context
  handoff snapshot) khi người dùng yêu cầu hoặc khi bật chế độ tự động tùy chọn
  (`auto_handoff` / `auto_handoff_and_new_chat`). Kích hoạt khi người dùng hỏi
  về số token, muốn lưu ngữ cảnh, mở Token Guard, hoặc khi hệ thống gửi
  `[TOKEN_GUARD_AUTO_HANDOFF]`.
---

# Token Guard — Realtime Monitor & Context Handoff

Skill này hỗ trợ theo dõi số liệu token local trên Side Pane (`open_token_guard`) và lưu ngữ cảnh (`handoff snapshot` < 1,200 tokens) theo yêu cầu. Mặc định plugin chạy ở chế độ `suggest` (chỉ cảnh báo, **không** tự động lưu ngữ cảnh hay tự mở phiên mới). Các chế độ tự động (`auto_handoff`, `auto_handoff_and_new_chat`) là tùy chọn (opt-in) trong `config.json`.

> **Lưu ý về chỉ số:** Số liệu hiển thị là **tổng lượng token local** đọc từ file transcript của host và phần trăm tính theo **ngưỡng cảnh báo do người dùng cấu hình**, không phải quota chính thức của nhà cung cấp hay dung lượng cửa sổ ngữ cảnh thực tế của model.

## 1. Kiểm tra nhanh hoặc mở Side Pane

- Khi người dùng muốn xem trực quan: gọi tool `open_token_guard` (tự động mở ở Side Pane).
- Khi người dùng hỏi **"kiểm tra token"**:
  1. Đọc số liệu mới nhất từ `<SYSTEM_MESSAGE>` `[TOKEN_GUARD]`, hoặc chạy:
     ```bash
     python3 "<plugin_dir>/scripts/token_tracker.py" --live
     ```
  2. Trả lời gọn bằng **1 dòng thanh status bar** duy nhất (`Ngữ cảnh / ngưỡng cảnh báo · Tổng phiên (local)`).

## 2. Quy trình Lưu ngữ cảnh (Context Handoff Snapshot)

Kích hoạt khi người dùng yêu cầu **"Lưu ngữ cảnh"** hoặc khi chế độ opt-in được bật và hệ thống gửi `[TOKEN_GUARD_AUTO_HANDOFF]`:

### Bước 1: Tạo bản tóm tắt cô đọng (mục tiêu < 1,200 tokens)
Chỉ giữ thông tin thực sự cần để tiếp tục công việc, bỏ log dài và các thử nghiệm đã hủy:

```markdown
# Context Handoff — <Tên ngắn gọn của tác vụ>
- **Thời điểm lưu:** <YYYY-MM-DD HH:MM>

## 1. Mục tiêu chính
- ...

## 2. Quyết định & Ràng buộc đã chốt
- ...

## 3. Các file đã tạo / chỉnh sửa
- `path/to/file`: mô tả ngắn gọn thay đổi

## 4. Trạng thái hiện tại & Việc cần làm tiếp theo
- [x] Đã xong ...
- [ ] Bước tiếp theo: ...

## 5. Lỗi đang gặp / Lưu ý quan trọng (nếu có)
- ...
```

### Bước 2: Lưu file snapshot (không ghi đè artifact tác vụ sẵn có)
- **Nếu có workspace dự án:** lưu vào `<workspace>/.agents/context/handoff-latest.md` (không ghi đè các file báo cáo/tác vụ đang có của dự án).
- **Nếu không có workspace:** lưu thành artifact `context-handoff.md`.

### Bước 3: Hành động tiếp theo (chỉ mở phiên mới khi được yêu cầu hoặc bật opt-in)
- **Mặc định (khi người dùng chỉ yêu cầu "Lưu ngữ cảnh" hoặc ở chế độ `suggest` / `auto_handoff`):** không tự mở phiên mới; trả về đường dẫn file handoff vừa lưu và nhắc người dùng có thể gõ `/compact` hoặc tự mở phiên mới với file handoff đó.
- **Chỉ khi người dùng yêu cầu rõ *"Lưu ngữ cảnh và mở phiên mới sạch token"*** hoặc bật opt-in `auto_handoff_and_new_chat` và nhận `[TOKEN_GUARD_AUTO_HANDOFF]`:
  Thử gọi `ConversationService/CreateConversation` qua HTTP+JSON (best-effort, phụ thuộc API nội bộ của host Antigravity, không đảm bảo trên mọi phiên bản):
  ```bash
  curl -sS -X POST \
    "http://$ANTIGRAVITY_LS_ADDRESS/product.v1.ConversationService/CreateConversation" \
    -H "Content-Type: application/json" \
    -H "Connect-Protocol-Version: 1" \
    -H "x-antigravity-csrf-token: $ANTIGRAVITY_CSRF_TOKEN" \
    -d '{"title": "Tiếp tục: <Tên tác vụ>", "prompt": [{"text": "Đọc file <đường_dẫn_handoff> và tiếp tục thực hiện mục \"Trạng thái hiện tại & Việc cần làm tiếp theo\"."}]}'
  ```
  *(Nếu `$ANTIGRAVITY_PROJECT_ID` có giá trị, truyền thêm `"projectId": "$ANTIGRAVITY_PROJECT_ID"`).*
  - Nếu thành công: trả về link clickable `[Tiếp tục ở phiên mới](conversation://<conversation_id>)`.
  - **Fallback thủ công bắt buộc khi API lỗi hoặc thiếu biến môi trường:** báo rõ lỗi, giữ nguyên file handoff đã lưu và hướng dẫn người dùng tự mở phiên mới kèm đường dẫn `<đường_dẫn_handoff>`.

## 3. Mẹo tối ưu token hàng ngày
- Đọc file theo đoạn (`StartLine` / `EndLine`) thay vì đọc toàn bộ file lớn.
- Lọc output lệnh terminal dài (`Select-Object -First`, `rg`, `jq`) trước khi in ra.
- Đẩy tác vụ khảo sát nhiều file sang subagent `research` để không làm phình ngữ cảnh phiên chính.
