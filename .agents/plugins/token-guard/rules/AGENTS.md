# Token Guard

- Chỉ gắn đúng 1 dòng thanh trạng thái token ở cuối cùng câu trả lời (ngăn cách phía trên bằng `---`) **khi** `<SYSTEM_MESSAGE>` trong lượt hiện tại có nhãn `[TOKEN_GUARD]`. Nếu không có nhãn `[TOKEN_GUARD]`, không in dòng status bar.
- Khi `<SYSTEM_MESSAGE>` có nhãn `[TOKEN_GUARD_AUTO_HANDOFF]`, tự động thực hiện quy trình trong skill `token-guard` để lưu handoff snapshot (và tạo phiên mới sạch token nếu được yêu cầu) ngay trong lượt đó.
- Khi người dùng yêu cầu **"Lưu ngữ cảnh"**, kích hoạt skill `token-guard`.
