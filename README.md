# Agent Workflow Template

Template chuẩn cho **Lean Agent Workflow v2** (3 vai trò Planner / Coder / Reviewer độc lập, tối ưu nạp ngữ cảnh và kiểm thử theo rủi ro) đi kèm plugin **Token Guard v2.0.0**.

## Quy trình Lean Agent Workflow v2
- **Luật chung & hợp đồng vai trò:** [AGENTS.md](AGENTS.md)
- **Hướng dẫn áp dụng (Core / Scale-up):** [docs/agent/ADOPT.md](docs/agent/ADOPT.md)
- **Cấu trúc vai trò & mẫu:** [docs/agent/MAP.md](docs/agent/MAP.md)
- **Nguyên tắc điều chỉnh:** áp dụng cấu trúc tối ưu ngữ cảnh trước; chỉ tinh chỉnh thêm khi có dữ liệu đo đạc thực tế từ pilot.

## Cài đặt & Cập nhật tự động Token Guard (1 lệnh)

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/blamag999/agent-workflow-template/main/scripts/install-token-guard.ps1 | iex
```

**macOS / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/blamag999/agent-workflow-template/main/scripts/install-token-guard.sh | bash
```
*(Mặc định giữ nguyên `config.json` hiện có nếu đã cài; thêm `-Force` / `--force` để ghi đè cấu hình mặc định).*

## Cài đặt cho ChatGPT Web & Claude Web (Tampermonkey)
Mở link sau để Tampermonkey tự cài đặt và tự động cập nhật khi có phiên bản mới:
- https://raw.githubusercontent.com/blamag999/agent-workflow-template/main/extras/web-token-guard.user.js
