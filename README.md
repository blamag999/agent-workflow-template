# Agent Workflow Template

Template chuẩn cho workflow AI Agent, bao gồm plugin **Token Guard v2.0.0** (Antigravity MCP App Side Pane + Sidebar trái, tự động `auto_handoff_and_new_chat`, và Userscript cho ChatGPT / Claude Web).

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
