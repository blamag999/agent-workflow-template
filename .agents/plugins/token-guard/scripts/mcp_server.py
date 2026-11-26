#!/usr/bin/env python3
"""Zero-dependency stdio MCP Server for Token Guard MCP App (Side Pane & Global Sidebar)."""

import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
PLUGIN_DIR = SCRIPT_DIR.parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from token_tracker import get_live_snapshot, save_config  # noqa: E402

APP_URI = "ui://token-guard/panel.html"
UNIVERSAL_HANDOFF_PROMPT = (
    "Hãy tóm tắt ngắn gọn (< 1,200 tokens) toàn bộ ngữ cảnh phiên này để chuyển sang phiên mới: "
    "1) Mục tiêu chính, 2) Quyết định & ràng buộc đã chốt, 3) File/code đã sửa, "
    "4) Trạng thái hiện tại & việc cần làm tiếp theo, 5) Lưu ý/lỗi đang gặp."
)


def _write_response(req_id, result=None, error=None) -> None:
    msg = {"jsonrpc": "2.0", "id": req_id}
    if error is not None:
        msg["error"] = error
    else:
        msg["result"] = result
    sys.stdout.write(json.dumps(msg, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def _load_panel_html() -> str:
    html_path = PLUGIN_DIR / "ui" / "panel.html"
    if html_path.is_file():
        return html_path.read_text(encoding="utf-8")
    return "<html><body><h3>Token Guard UI not built yet.</h3></body></html>"


def _build_stats_payload(conversation_id: str = "") -> dict:
    snap = get_live_snapshot(PLUGIN_DIR, conversation_id=conversation_id)
    snap["universal_handoff_prompt"] = UNIVERSAL_HANDOFF_PROMPT
    return snap


def handle_request(req: dict) -> None:
    method = req.get("method", "")
    req_id = req.get("id")
    params = req.get("params") or {}

    # Notifications have no id and expect no response
    if req_id is None:
        return

    if method == "initialize":
        client_proto = params.get("protocolVersion") or "2024-11-05"
        _write_response(
            req_id,
            {
                "protocolVersion": client_proto,
                "capabilities": {"tools": {}, "resources": {}},
                "serverInfo": {"name": "token-guard", "version": "2.1.0"},
            },
        )
        return

    if method == "ping":
        _write_response(req_id, {})
        return

    if method == "resources/list":
        _write_response(
            req_id,
            {
                "resources": [
                    {
                        "uri": APP_URI,
                        "name": "Token Guard Panel",
                        "description": "Realtime token monitor & context handoff panel",
                        "mimeType": "text/html;profile=mcp-app",
                        "_meta": {"ui": {"prefersBorder": False}},
                    }
                ]
            },
        )
        return

    if method == "resources/read":
        uri = params.get("uri", "")
        if uri != APP_URI:
            _write_response(req_id, error={"code": -32602, "message": f"Unknown resource URI: {uri}"})
            return
        _write_response(
            req_id,
            {
                "contents": [
                    {
                        "uri": APP_URI,
                        "mimeType": "text/html;profile=mcp-app",
                        "text": _load_panel_html(),
                        "_meta": {"ui": {"prefersBorder": False}},
                    }
                ]
            },
        )
        return

    if method == "tools/list":
        _write_response(
            req_id,
            {
                "tools": [
                    {
                        "name": "open_token_guard",
                        "title": "Token Guard",
                        "description": "Mở bảng theo dõi token realtime trên Side Pane hoặc Sidebar trái.",
                        "inputSchema": {"type": "object", "properties": {}},
                        "_meta": {
                            "ui": {"resourceUri": APP_URI},
                            "com.google.antigravity/ui": {
                                "entrypoints": [
                                    {"type": "aux_pane", "title": "Token Guard"},
                                    {"type": "global", "title": "Token Guard"},
                                ]
                            },
                        },
                    },
                    {
                        "name": "get_live_stats",
                        "title": "Get Live Token Stats",
                        "description": "App-only: read live transcript token metrics.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "conversation_id": {"type": "string"},
                            },
                        },
                        "_meta": {"ui": {"visibility": ["app"]}},
                    },
                    {
                        "name": "update_config",
                        "title": "Update Token Guard Config",
                        "description": "App-only: update thresholds and auto-handoff mode.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "warn_threshold": {"type": "integer"},
                                "critical_threshold": {"type": "integer"},
                                "spike_threshold": {"type": "integer"},
                                "show_every_turn": {"type": "boolean"},
                                "red_threshold_mode": {"type": "string"},
                            },
                        },
                        "_meta": {"ui": {"visibility": ["app"]}},
                    },
                ]
            },
        )
        return

    if method == "tools/call":
        name = params.get("name", "")
        args = params.get("arguments") or {}

        if name in ("open_token_guard", "get_live_stats"):
            conv_id = str(args.get("conversation_id") or "")
            payload = _build_stats_payload(conv_id)
            active = payload.get("active") or {}
            stats = active.get("stats") or {}
            ctx = stats.get("current_context", 0)
            crit = payload["config"].get("critical_threshold", 120000)
            _write_response(
                req_id,
                {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Token Guard (local): {ctx:,} / ngưỡng {crit:,} tokens (turns: {stats.get('turns', 0)}).",
                        }
                    ],
                    "structuredContent": payload,
                },
            )
            return

        if name == "update_config":
            updated = save_config(PLUGIN_DIR, args)
            _write_response(
                req_id,
                {
                    "content": [{"type": "text", "text": "Updated Token Guard config."}],
                    "structuredContent": {"config": updated},
                },
            )
            return

        _write_response(req_id, error={"code": -32601, "message": f"Unknown tool: {name}"})
        return

    _write_response(req_id, error={"code": -32601, "message": f"Method not found: {method}"})


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            handle_request(req)
        except Exception as exc:
            sys.stderr.write(f"[token-guard mcp_server] error: {exc}\n")
            sys.stderr.flush()


if __name__ == "__main__":
    main()
