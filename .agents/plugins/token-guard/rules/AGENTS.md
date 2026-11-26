# Token Guard

- Chỉ gắn đúng 1 dòng thanh trạng thái token ở cuối cùng câu trả lời (ngăn cách phía trên bằng `---`) **khi** `<SYSTEM_MESSAGE>` trong lượt hiện tại có nhãn `[TOKEN_GUARD]`. Nếu không có nhãn `[TOKEN_GUARD]`, không in dòng status bar.
- Mặc định plugin chạy ở chế độ `suggest` (chỉ cảnh báo, không tự động lưu ngữ cảnh hay tạo phiên mới).
- Chỉ khi người dùng chủ động bật chế độ tự động trong `config.json` (`auto_handoff` hoặc `auto_handoff_and_new_chat`) và `<SYSTEM_MESSAGE>` có nhãn `[TOKEN_GUARD_AUTO_HANDOFF]`, mới thực hiện quy trình trong skill `token-guard` ngay trong lượt đó.
- Khi người dùng yêu cầu **"Lưu ngữ cảnh"**, kích hoạt skill `token-guard`.
