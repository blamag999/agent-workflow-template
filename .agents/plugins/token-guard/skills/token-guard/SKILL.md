---
name: token-guard
description: >-
  Kiểm tra số lượng token realtime, mở Side Pane Token Guard, cảnh báo khi chạm
  ngưỡng và lưu ngữ cảnh (context handoff snapshot) hoặc tự động tạo phiên mới
  sạch token (`auto_handoff_and_new_chat`). Kích hoạt khi người dùng hỏi về số
  token, muốn lưu ngữ cảnh, mở Token Guard, hoặc khi hệ thống gửi
  `[TOKEN_GUARD_AUTO_HANDOFF]`.
---

# Token Guard — Realtime Monitor & Context Handoff

Skill này hỗ trợ theo dõi token realtime trên Side Pane (`open_token_guard`), lưu ngữ cảnh (`handoff snapshot` < 1,200 tokens) và tự động mở phiên mới sạch token khi chạm ngưỡng đỏ.

## 1. Kiểm tra nhanh hoặc mở Side Pane

- Khi người dùng muốn xem trực quan: gọi tool `open_token_guard` (tự động mở ở Side Pane).
- Khi người dùng hỏi **"kiểm tra token"**:
  1. Đọc số liệu mới nhất từ `<SYSTEM_MESSAGE>` `[TOKEN_GUARD]`, hoặc chạy:
     ```bash
     python3 "<plugin_dir>/scripts/token_tracker.py" --live
     ```
  2. Trả lời gọn bằng **1 dòng thanh status bar** duy nhất (`Token đang dùng / Ngưỡng · Tổng phiên`).

## 2. Quy trình Lưu ngữ cảnh (Context Handoff Snapshot)

Kích hoạt khi người dùng yêu cầu **"Lưu ngữ cảnh"** hoặc khi hệ thống gửi `[TOKEN_GUARD_AUTO_HANDOFF]`:

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

### Bước 2: Lưu file snapshot
- **Nếu có workspace dự án:** lưu vào `<workspace>/.agents/context/handoff-latest.md`.
- **Nếu không có workspace:** lưu thành artifact `context-handoff.md`.

### Bước 3: Tự động mở phiên mới (`auto_handoff_and_new_chat`) hoặc hướng dẫn giảm token
- **Khi `[TOKEN_GUARD_AUTO_HANDOFF]` yêu cầu tạo phiên mới** (hoặc người dùng chọn *"Lưu ngữ cảnh và mở phiên mới sạch token"*):
  Gọi `ConversationService/CreateConversation` qua HTTP+JSON:
  ```bash
  curl -sS -X POST \
    "http://$ANTIGRAVITY_LS_ADDRESS/product.v1.ConversationService/CreateConversation" \
    -H "Content-Type: application/json" \
    -H "Connect-Protocol-Version: 1" \
    -H "x-antigravity-csrf-token: $ANTIGRAVITY_CSRF_TOKEN" \
    -d '{"title": "Tiếp tục: <Tên tác vụ>", "prompt": [{"text": "Đọc file <đường_dẫn_handoff> và tiếp tục thực hiện mục \"Trạng thái hiện tại & Việc cần làm tiếp theo\"."}]}'
  ```
  *(Nếu `$ANTIGRAVITY_PROJECT_ID` có giá trị, truyền thêm `"projectId": "$ANTIGRAVITY_PROJECT_ID"`).*
  Sau đó trả về link clickable `[Tiếp tục ở phiên mới](conversation://<conversation_id>)`.
- **Nếu chỉ lưu thủ công:** nhắc người dùng có thể gõ `/compact` để nén tại chỗ hoặc mở phiên mới với file handoff vừa lưu.

## 3. Mẹo tối ưu token hàng ngày
- Đọc file theo đoạn (`StartLine` / `EndLine`) thay vì đọc toàn bộ file lớn.
- Lọc output lệnh terminal dài (`Select-Object -First`, `rg`, `jq`) trước khi in ra.
- Đẩy tác vụ khảo sát nhiều file sang subagent `research` để không làm phình ngữ cảnh phiên chính.
