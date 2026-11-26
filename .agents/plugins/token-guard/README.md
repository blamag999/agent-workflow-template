# Token Guard (v2.1.0 Lite)

Plugin tùy chọn (độc lập với Lean Agent Workflow v2) theo dõi số liệu token local realtime cho **Antigravity** (Side Pane + Sidebar trái) và **ChatGPT / Claude Web** (Tampermonkey Userscript copy-only).

## Phân biệt chỉ số (quan trọng)
- **Plugin Antigravity:** đọc trực tiếp các bản ghi `PLANNER_RESPONSE` trong file transcript cục bộ (`input_tokens + cache_read_tokens` cho ngữ cảnh lượt gần nhất, và tổng cộng dồn `input + cache_read + output` là **tổng lượng token local** theo giả định các trường tách biệt). Phần trăm `%` là tỷ lệ so với **ngưỡng cảnh báo do người dùng cấu hình**, **không phải** quota chính thức của nhà cung cấp, token tính phí hay dung lượng context window thực của model.
- **Userscript Web (ChatGPT / Claude):** chỉ ước lượng cục bộ từ văn bản hiển thị trong DOM (`~chars / 3.8`), **chưa bao gồm** tệp đính kèm, ảnh, system prompt hoặc ngữ cảnh ẩn. Phần trăm `%` cũng là tỷ lệ theo ngưỡng cảnh báo cấu hình.

## Tính năng chính
- **MCP App Side Pane & Sidebar trái (`open_token_guard`):** Cập nhật realtime từ transcript local, ăn theo Dark/Light theme, hiển thị biến động `Δ lượt gần nhất` (có dấu âm sau khi nén `/compact`), phát hiện tăng đột biến (`⚡ Spike`), tổng local 5 giờ / 7 ngày, chỉnh ngưỡng và bấm **Lưu ngữ cảnh**.
- **Khung chat gọn (`show_every_turn: false`) & mặc định an toàn (`red_threshold_mode: "suggest"`):**
  - Mức Xanh (`< 80,000`): im lặng trong chat.
  - Mức Vàng (`>= 80,000`): hiện 1 dòng cảnh báo gọn cuối câu trả lời.
  - Mức Đỏ (`>= 120,000`): **mặc định `suggest`** — chỉ cảnh báo và gợi ý `"Lưu ngữ cảnh"` hoặc `/compact`, **không** tự động lưu hay tự mở phiên mới. Các chế độ `auto_handoff` và `auto_handoff_and_new_chat` là tùy chọn (opt-in) trong `config.json` hoặc Side Pane.
- **Userscript cho ChatGPT & Claude Web (`extras/web-token-guard.user.js`):** chế độ **copy-only** (không chèn vào ô nhập liệu để bảo vệ bản nháp), chạy hoàn toàn cục bộ, không gọi mạng và không lưu nội dung hội thoại vào `localStorage` (chỉ lưu cấu hình ngưỡng theo từng origin).

## Cài đặt an toàn (tải xuống → kiểm tra → chạy)

**Windows (PowerShell):**
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/blamag999/agent-workflow-template/main/scripts/install-token-guard.ps1" -OutFile ".\install-token-guard.ps1"
Get-Content .\install-token-guard.ps1
.\install-token-guard.ps1
# Dùng .\install-token-guard.ps1 -Force nếu muốn ghi đè config.json bằng mặc định
```

**macOS / Linux (Bash):**
```bash
curl -fsSL "https://raw.githubusercontent.com/blamag999/agent-workflow-template/main/scripts/install-token-guard.sh" -o ./install-token-guard.sh
less ./install-token-guard.sh
bash ./install-token-guard.sh
# Dùng bash ./install-token-guard.sh --force nếu muốn ghi đè config.json bằng mặc định
```

*Lưu ý cài đặt:* Mặc định installer giữ lại file `config.json` hiện có nếu file **không rỗng**; chế độ `-Force` / `--force` sẽ ghi đè bằng cấu hình mặc định. Trường hợp `config.json` rỗng hoặc quá trình sao chép bị gián đoạn giữa chừng không có cơ chế rollback tự động.

## Cấu hình (`config.json`)
- `warn_threshold`: `80000`
- `critical_threshold`: `120000`
- `spike_threshold`: `15000`
- `show_every_turn`: `false`
- `red_threshold_mode`: `"suggest"` (mặc định; tùy chọn opt-in: `"auto_handoff"` | `"auto_handoff_and_new_chat"`)
- `debounce_delta`: `30000`
- `poll_interval_ms`: `2000`
