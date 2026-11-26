# Agent Workflow Template

Template chuẩn cho **Lean Agent Workflow v2** (3 vai trò Planner / Coder / Reviewer độc lập, tối ưu nạp ngữ cảnh và kiểm thử theo rủi ro) đi kèm plugin tùy chọn **Token Guard v2.1.0 Lite** (độc lập với Lean v2).

## Quy trình Lean Agent Workflow v2
- **Luật chung & hợp đồng vai trò:** [AGENTS.md](AGENTS.md)
- **Hướng dẫn áp dụng (Core / Scale-up):** [docs/agent/ADOPT.md](docs/agent/ADOPT.md)
- **Cấu trúc vai trò & mẫu:** [docs/agent/MAP.md](docs/agent/MAP.md)
- **Nguyên tắc điều chỉnh:** áp dụng cấu trúc tối ưu ngữ cảnh trước; chỉ tinh chỉnh thêm khi có dữ liệu đo đạc thực tế từ pilot.

## Cài đặt & Cập nhật Token Guard (tải xuống → kiểm tra → chạy)

Khuyến nghị tải script về, kiểm tra nội dung trước khi chạy:

**Windows (PowerShell):**
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/blamag999/agent-workflow-template/main/scripts/install-token-guard.ps1" -OutFile ".\install-token-guard.ps1"
Get-Content .\install-token-guard.ps1
.\install-token-guard.ps1
```

**macOS / Linux:**
```bash
curl -fsSL "https://raw.githubusercontent.com/blamag999/agent-workflow-template/main/scripts/install-token-guard.sh" -o ./install-token-guard.sh
less ./install-token-guard.sh
bash ./install-token-guard.sh
```
*(Mặc định giữ nguyên `config.json` không rỗng hiện có nếu đã cài; thêm `-Force` / `--force` để ghi đè cấu hình mặc định. Chế độ mặc định là `suggest` — chỉ cảnh báo theo ngưỡng cấu hình, các chế độ tự động là tùy chọn. Chỉ số hiển thị là thống kê local từ transcript, không phải quota chính thức của nhà cung cấp).*

## Cài đặt cho ChatGPT Web & Claude Web (Tampermonkey)
Mở link sau để kiểm tra mã nguồn và cài đặt userscript (copy-only, ước lượng cục bộ từ văn bản hiển thị, không gửi dữ liệu ra ngoài; cấu hình ngưỡng lưu tách biệt theo từng origin trong `localStorage`):
- https://raw.githubusercontent.com/blamag999/agent-workflow-template/main/extras/web-token-guard.user.js
