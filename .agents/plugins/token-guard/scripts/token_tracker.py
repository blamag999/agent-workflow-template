#!/usr/bin/env python3
"""Antigravity PreInvocation + PostInvocation hook & live transcript analyzer for Token Guard."""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_CONFIG = {
    "warn_threshold": 80000,
    "critical_threshold": 120000,
    "spike_threshold": 15000,
    "show_every_turn": False,
    "red_threshold_mode": "auto_handoff_and_new_chat",
    "debounce_delta": 30000,
    "poll_interval_ms": 2000,
}


def is_global_plugin_active_elsewhere(current_plugin_dir: Path) -> bool:
    """Avoid duplicate hook output when both global and workspace plugins are enabled."""
    global_dir = Path.home() / ".gemini" / "config" / "plugins" / "token-guard"
    try:
        if current_plugin_dir.resolve() == global_dir.resolve():
            return False
        if not (global_dir / "hooks.json").is_file():
            return False
        cfg_file = Path.home() / ".gemini" / "config" / "config.json"
        if cfg_file.is_file():
            data = json.loads(cfg_file.read_text(encoding="utf-8"))
            tg_cfg = data.get("plugins", {}).get("token-guard", {})
            if tg_cfg.get("enabled") is False:
                return False
        return True
    except Exception:
        return False


def load_config(plugin_dir: Path) -> dict:
    """Load plugin config.json merged with defaults."""
    cfg = dict(DEFAULT_CONFIG)
    config_path = plugin_dir / "config.json"
    if config_path.is_file():
        try:
            data = json.loads(config_path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                cfg.update(data)
        except Exception:
            pass
    return cfg


def save_config(plugin_dir: Path, updates: dict) -> dict:
    """Validate and persist partial config updates to config.json."""
    cfg = load_config(plugin_dir)
    int_keys = ("warn_threshold", "critical_threshold", "spike_threshold", "debounce_delta", "poll_interval_ms")
    for k in int_keys:
        if k in updates and updates[k] is not None:
            cfg[k] = max(1000 if k != "poll_interval_ms" else 500, int(updates[k]))
    if "show_every_turn" in updates and updates["show_every_turn"] is not None:
        cfg["show_every_turn"] = bool(updates["show_every_turn"])
    if "red_threshold_mode" in updates and updates["red_threshold_mode"] in (
        "auto_handoff_and_new_chat",
        "auto_handoff",
        "suggest",
    ):
        cfg["red_threshold_mode"] = updates["red_threshold_mode"]

    config_path = plugin_dir / "config.json"
    config_path.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return cfg


def extract_conversation_id(transcript_path: str) -> str:
    """Extract conversation UUID from .../brain/<conv-id>/.system_generated/logs/transcript.jsonl."""
    if not transcript_path:
        return ""
    parts = Path(transcript_path).parts
    for i, part in enumerate(parts):
        if part == "brain" and i + 1 < len(parts):
            return parts[i + 1]
    return Path(transcript_path).parent.name


def _iso_mtime(path: Path) -> str:
    try:
        ts = path.stat().st_mtime
        return datetime.fromtimestamp(ts, tz=timezone.utc).astimezone().isoformat(timespec="seconds")
    except Exception:
        return ""


def parse_transcript(transcript_path: str, cfg: dict | None = None) -> dict:
    """Parse transcript.jsonl and compute context, delta, spike, and turns-left metrics."""
    cfg = cfg or DEFAULT_CONFIG
    crit = int(cfg.get("critical_threshold", 120000))
    spike_thresh = int(cfg.get("spike_threshold", 15000))

    empty = {
        "turns": 0,
        "current_context": 0,
        "prev_context": 0,
        "delta_tokens": 0,
        "avg_delta": 0,
        "est_turns_left": None,
        "is_spike": False,
        "total_tokens": 0,
        "last_updated": "",
    }
    if not transcript_path:
        return empty
    path = Path(transcript_path)
    if not path.is_file():
        return empty

    turns = 0
    total_tokens = 0
    last_context = 0
    prev_context = 0

    with path.open("r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            if entry.get("type") != "PLANNER_RESPONSE":
                continue

            inp = int(entry.get("input_tokens") or 0)
            cache = int(entry.get("cache_read_tokens") or 0)
            out = int(entry.get("output_tokens") or 0)

            turns += 1
            prev_context = last_context
            last_context = inp + cache
            total_tokens += inp + cache + out

    delta_tokens = (last_context - prev_context) if turns >= 2 else last_context
    avg_delta = round(last_context / turns) if turns > 0 else 0
    remaining = max(0, crit - last_context)
    est_turns_left = (remaining // avg_delta) if avg_delta > 0 else None

    return {
        "turns": turns,
        "current_context": last_context,
        "prev_context": prev_context,
        "delta_tokens": delta_tokens,
        "avg_delta": avg_delta,
        "est_turns_left": est_turns_left,
        "is_spike": delta_tokens >= spike_thresh,
        "total_tokens": total_tokens,
        "last_updated": _iso_mtime(path),
    }


def make_bar(value: int, maximum: int, width: int = 12) -> str:
    if maximum <= 0:
        return "░" * width
    ratio = min(max(value / maximum, 0.0), 1.0)
    filled = round(ratio * width)
    return "█" * filled + "░" * (width - filled)


def _state_path(plugin_dir: Path) -> Path:
    return plugin_dir / ".state" / "active_session.json"


def load_state(plugin_dir: Path) -> dict:
    path = _state_path(plugin_dir)
    if path.is_file():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                data.setdefault("auto_handoff_marks", {})
                return data
        except Exception:
            pass
    return {"active": None, "auto_handoff_marks": {}}


def save_state(plugin_dir: Path, state: dict) -> None:
    path = _state_path(plugin_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def scan_recent_sessions(cfg: dict, limit: int = 10) -> list[dict]:
    """Scan ~/.gemini/antigravity/brain/*/.system_generated/logs/transcript.jsonl sorted by mtime desc."""
    brain_dir = Path.home() / ".gemini" / "antigravity" / "brain"
    if not brain_dir.is_dir():
        return []

    candidates: list[tuple[float, Path]] = []
    for tpath in brain_dir.glob("*/.system_generated/logs/transcript.jsonl"):
        try:
            candidates.append((tpath.stat().st_mtime, tpath))
        except Exception:
            continue

    candidates.sort(key=lambda item: item[0], reverse=True)
    sessions = []
    for _, tpath in candidates[:limit]:
        conv_id = extract_conversation_id(str(tpath))
        stats = parse_transcript(str(tpath), cfg)
        sessions.append(
            {
                "conversation_id": conv_id,
                "transcript_path": str(tpath),
                "updated_at": stats["last_updated"],
                "stats": stats,
            }
        )
    return sessions


def get_live_snapshot(plugin_dir: Path, conversation_id: str = "") -> dict:
    """Return live stats for requested or most-recently-active session plus recent sessions."""
    cfg = load_config(plugin_dir)
    state = load_state(plugin_dir)
    recent = scan_recent_sessions(cfg, limit=10)

    active = None
    if conversation_id:
        for s in recent:
            if s["conversation_id"] == conversation_id:
                active = s
                break
        if active is None:
            tpath = Path.home() / ".gemini" / "antigravity" / "brain" / conversation_id / ".system_generated" / "logs" / "transcript.jsonl"
            if tpath.is_file():
                active = {
                    "conversation_id": conversation_id,
                    "transcript_path": str(tpath),
                    "updated_at": _iso_mtime(tpath),
                    "stats": parse_transcript(str(tpath), cfg),
                }

    if active is None:
        state_active = state.get("active")
        if recent and state_active:
            # Prefer whichever transcript was modified most recently
            r0 = recent[0]
            s_path = Path(state_active.get("transcript_path", ""))
            r_path = Path(r0["transcript_path"])
            s_mtime = s_path.stat().st_mtime if s_path.is_file() else 0.0
            r_mtime = r_path.stat().st_mtime if r_path.is_file() else 0.0
            if r_mtime >= s_mtime:
                active = r0
            else:
                active = {
                    "conversation_id": state_active.get("conversation_id", ""),
                    "transcript_path": str(s_path),
                    "updated_at": _iso_mtime(s_path),
                    "stats": parse_transcript(str(s_path), cfg),
                }
        elif recent:
            active = recent[0]
        elif state_active:
            active = state_active

    return {
        "active": active,
        "config": cfg,
        "recent_sessions": recent,
    }


def build_status_line(stats: dict, cfg: dict) -> str:
    """Build 1-line markdown status bar."""
    ctx = stats["current_context"]
    total = stats["total_tokens"]
    turns = stats["turns"]
    warn = int(cfg.get("warn_threshold", 80000))
    crit = int(cfg.get("critical_threshold", 120000))

    pct = int(round((ctx / crit) * 100)) if crit > 0 else 0
    bar = make_bar(ctx, crit)

    if ctx >= crit:
        return (
            f"🔴 `[{bar}]` **Token: {ctx:,} / {crit:,}** ({pct}%) · Tổng phiên: **{total:,}** "
            f"— **Vượt ngưỡng!** Gõ **\"Lưu ngữ cảnh\"** rồi `/compact`"
        )
    if ctx >= warn:
        return (
            f"🟡 `[{bar}]` **Token: {ctx:,} / {crit:,}** ({pct}%) · Tổng phiên: **{total:,}** "
            f"— Sắp đầy, nên **\"Lưu ngữ cảnh\"** hoặc `/compact`"
        )
    if turns == 0:
        return f"🟢 `[{bar}]` **Token: 0 / {crit:,}** (0%) · Tổng phiên: **0** *(Lượt đầu)*"
    return f"🟢 `[{bar}]` **Token: {ctx:,} / {crit:,}** ({pct}%) · Tổng phiên: **{total:,}**"


def build_hook_message(stats: dict, cfg: dict, conv_id: str, state: dict, plugin_dir: Path) -> str | None:
    """Return hook system message or None when idle/green and show_every_turn is false."""
    ctx = stats["current_context"]
    warn = int(cfg.get("warn_threshold", 80000))
    crit = int(cfg.get("critical_threshold", 120000))
    show_every = bool(cfg.get("show_every_turn", False))
    mode = cfg.get("red_threshold_mode", "auto_handoff_and_new_chat")
    debounce_delta = int(cfg.get("debounce_delta", 30000))

    status = build_status_line(stats, cfg)

    if ctx < warn:
        if not show_every:
            return None
        return (
            "[TOKEN_GUARD] Bắt buộc hiển thị nguyên văn 1 dòng status bar mới nhất này "
            "ở cuối cùng câu trả lời gửi người dùng (ngăn cách phía trên bằng `---`):\n"
            f"{status}"
        )

    if ctx < crit:
        return (
            "[TOKEN_GUARD] Bắt buộc hiển thị nguyên văn 1 dòng status bar mới nhất này "
            "ở cuối cùng câu trả lời gửi người dùng (ngăn cách phía trên bằng `---`):\n"
            f"{status}"
        )

    # Red threshold (>= crit)
    marks = state.setdefault("auto_handoff_marks", {})
    last_mark = marks.get(conv_id)
    should_auto = (last_mark is None) or (ctx - int(last_mark) >= debounce_delta)

    if mode in ("auto_handoff", "auto_handoff_and_new_chat") and should_auto:
        marks[conv_id] = ctx
        save_state(plugin_dir, state)
        extra = (
            "Đồng thời tạo sẵn 1 phiên hội thoại mới sạch token qua `ConversationService/CreateConversation` "
            "và trả về link `[Tiếp tục ở phiên mới](conversation://<id>)`."
            if mode == "auto_handoff_and_new_chat"
            else "Sau đó nhắc người dùng gõ `/compact` hoặc mở phiên mới."
        )
        return (
            f"[TOKEN_GUARD_AUTO_HANDOFF] Ngữ cảnh đã vượt ngưỡng đỏ ({ctx:,} / {crit:,}). "
            f"Hãy tự động thực hiện skill `token-guard` để lưu file handoff (< 1,200 tokens) ngay cuối lượt này. {extra}\n"
            "[TOKEN_GUARD] Bắt buộc hiển thị nguyên văn 1 dòng status bar mới nhất này "
            "ở cuối cùng câu trả lời gửi người dùng (ngăn cách phía trên bằng `---`):\n"
            f"{status}"
        )

    return (
        "[TOKEN_GUARD] Bắt buộc hiển thị nguyên văn 1 dòng status bar mới nhất này "
        "ở cuối cùng câu trả lời gửi người dùng (ngăn cách phía trên bằng `---`):\n"
        f"{status}"
    )


def main() -> None:
    plugin_dir = Path(__file__).resolve().parent.parent

    if len(sys.argv) >= 2 and sys.argv[1] == "--live":
        print(json.dumps(get_live_snapshot(plugin_dir), ensure_ascii=False, indent=2))
        return

    if len(sys.argv) >= 3 and sys.argv[1] == "--json":
        cfg = load_config(plugin_dir)
        stats = parse_transcript(sys.argv[2], cfg)
        stats["status_bar"] = build_status_line(stats, cfg)
        print(json.dumps(stats, ensure_ascii=False, indent=2))
        return

    if is_global_plugin_active_elsewhere(plugin_dir):
        print("{}")
        return

    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {}
    except Exception:
        print("{}")
        return

    try:
        transcript_path = payload.get("transcriptPath", "")
        cfg = load_config(plugin_dir)
        stats = parse_transcript(transcript_path, cfg)
        conv_id = extract_conversation_id(transcript_path)

        state = load_state(plugin_dir)
        if transcript_path:
            state["active"] = {
                "conversation_id": conv_id,
                "transcript_path": transcript_path,
                "updated_at": datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds"),
                "stats": stats,
            }
            save_state(plugin_dir, state)

        msg = build_hook_message(stats, cfg, conv_id, state, plugin_dir)
        if not msg:
            print("{}")
            return

        result = {
            "injectSteps": [
                {
                    "systemMessage": {
                        "systemMessage": msg
                    }
                }
            ]
        }
        print(json.dumps(result, ensure_ascii=False))
    except Exception:
        print("{}")


if __name__ == "__main__":
    main()
