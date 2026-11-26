#!/usr/bin/env bash
set -euo pipefail

FORCE=0
if [[ "${1:-}" == "--force" ]]; then
  FORCE=1
fi

REPO_URL="https://github.com/blamag999/agent-workflow-template.git"
TARGET_DIR="${HOME}/.gemini/config/plugins/token-guard"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

git clone --depth 1 "$REPO_URL" "$TMP_DIR" >/dev/null 2>&1
mkdir -p "$TARGET_DIR"

CFG_BACKUP=""
if [[ "$FORCE" -eq 0 && -f "$TARGET_DIR/config.json" ]]; then
  CFG_BACKUP="$(cat "$TARGET_DIR/config.json")"
fi

cp -R "$TMP_DIR/.agents/plugins/token-guard/." "$TARGET_DIR/"
if [[ -n "$CFG_BACKUP" ]]; then
  printf '%s\n' "$CFG_BACKUP" > "$TARGET_DIR/config.json"
fi

echo "Token Guard da duoc cai dat / cap nhat tai: $TARGET_DIR"
