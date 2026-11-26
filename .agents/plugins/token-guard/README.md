# Token Guard (v2.0.0)

Plugin theo dõi token realtime cho **Antigravity** (Side Pane + Sidebar trái) và **ChatGPT / Claude Web** (Tampermonkey Userscript), giúp giữ khung chat gọn gàng và tự động lưu ngữ cảnh khi chạm ngưỡng.

## Tính năng chính
- **MCP App Side Pane & Sidebar trái (`open_token_guard`):** Cập nhật realtime mỗi 2 giây (0 tốn token ngữ cảnh), tự ăn theo Dark/Light theme, phát hiện đốt token đột biến (`⚡ Spike`), ước lượng số lượt còn lại, chỉnh ngưỡng trực tiếp và bấm 1-click **Lưu ngữ cảnh**.
- **Khung chat gọn (`show_every_turn: false`):**
  - Mức Xanh (`< 80,000`): im lặng hoàn toàn trong chat.
  - Mức Vàng (`>= 80,000`): hiện 1 dòng cảnh báo gọn cuối câu trả lời.
  - Mức Đỏ (`>= 120,000`): mặc định chạy `auto_handoff_and_new_chat` (tự lưu file handoff `< 1,200` tokens + tạo sẵn phiên mới sạch token kèm link chuyển tiếp, có debounce `+30,000` để không spam).
- **Userscript cho ChatGPT & Claude Web:** `extras/web-token-guard.user.js` hỗ trợ tự động cập nhật qua GitHub Raw.

## Cấu hình (`config.json`)
- `warn_threshold`: `80000`
- `critical_threshold`: `120000`
- `spike_threshold`: `15000`
- `show_every_turn`: `false`
- `red_threshold_mode`: `"auto_handoff_and_new_chat"` (`"auto_handoff"` | `"suggest"`)
- `debounce_delta`: `30000`
- `poll_interval_ms`: `2000`
