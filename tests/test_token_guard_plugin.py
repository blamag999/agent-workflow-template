#!/usr/bin/env python3
"""Zero-dependency unit & smoke tests for Token Guard v2.1 Lite (T1-T5)."""

import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

REPO_ROOT = Path(__file__).resolve().parent.parent
PLUGIN_DIR = REPO_ROOT / ".agents" / "plugins" / "token-guard"
SCRIPTS_DIR = PLUGIN_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

import mcp_server  # noqa: E402
import token_tracker  # noqa: E402


class TestT1DefaultSafety(unittest.TestCase):
    """T1: Default persisted config & Python fallback use suggest; no autonomous handoff."""

    def test_persisted_config_defaults_to_suggest(self):
        cfg = json.loads((PLUGIN_DIR / "config.json").read_text(encoding="utf-8"))
        self.assertEqual(cfg.get("red_threshold_mode"), "suggest")

    def test_python_default_config_is_suggest(self):
        self.assertEqual(token_tracker.DEFAULT_CONFIG.get("red_threshold_mode"), "suggest")

    def test_crossing_critical_in_default_and_fallback_never_auto_handoffs(self):
        stats = {
            "turns": 5,
            "current_context": 150000,
            "prev_context": 110000,
            "delta_tokens": 40000,
            "is_spike": True,
            "total_tokens": 500000,
            "last_updated": "2026-11-26T12:00:00+00:00",
        }
        with tempfile.TemporaryDirectory() as tmp:
            plugin_dir = Path(tmp)
            # 1) Explicit default config
            msg_default = token_tracker.build_hook_message(
                stats, dict(token_tracker.DEFAULT_CONFIG), "conv-1", {}, plugin_dir
            )
            self.assertIsNotNone(msg_default)
            self.assertIn("[TOKEN_GUARD]", msg_default)
            self.assertNotIn("[TOKEN_GUARD_AUTO_HANDOFF]", msg_default)
            self.assertNotIn("CreateConversation", msg_default)

            # 2) Fallback when red_threshold_mode key is omitted
            cfg_no_mode = {"warn_threshold": 80000, "critical_threshold": 120000}
            msg_fallback = token_tracker.build_hook_message(
                stats, cfg_no_mode, "conv-2", {}, plugin_dir
            )
            self.assertIsNotNone(msg_fallback)
            self.assertIn("[TOKEN_GUARD]", msg_fallback)
            self.assertNotIn("[TOKEN_GUARD_AUTO_HANDOFF]", msg_fallback)
            self.assertNotIn("CreateConversation", msg_fallback)

    def test_opt_in_auto_handoff_remains_separate(self):
        stats = {
            "turns": 5,
            "current_context": 150000,
            "prev_context": 110000,
            "delta_tokens": 40000,
            "is_spike": True,
            "total_tokens": 500000,
            "last_updated": "2026-11-26T12:00:00+00:00",
        }
        with tempfile.TemporaryDirectory() as tmp:
            plugin_dir = Path(tmp)
            cfg = dict(token_tracker.DEFAULT_CONFIG)
            cfg["red_threshold_mode"] = "auto_handoff_and_new_chat"
            msg = token_tracker.build_hook_message(stats, cfg, "conv-optin", {}, plugin_dir)
            self.assertIsNotNone(msg)
            self.assertIn("[TOKEN_GUARD_AUTO_HANDOFF]", msg)
            self.assertIn("CreateConversation", msg)

    def test_rules_and_skill_opt_in_and_lean_independent(self):
        rules = (PLUGIN_DIR / "rules" / "AGENTS.md").read_text(encoding="utf-8")
        skill = (PLUGIN_DIR / "skills" / "token-guard" / "SKILL.md").read_text(encoding="utf-8")
        self.assertIn("suggest", rules)
        self.assertIn("suggest", skill)
        self.assertNotIn("docs/agent/work/", skill)
        self.assertNotIn("work/*", skill)


class TestT2DisjointCacheAndMalformedInput(unittest.TestCase):
    """T2: Disjoint input+cache accounting & robust malformed/null handling."""

    def setUp(self):
        token_tracker.clear_parse_cache()

    def test_disjoint_fields_and_malformed_lines_consistent_across_session_and_window(self):
        now_iso = datetime.now(timezone.utc).isoformat()
        lines = [
            # Valid disjoint turn: ctx = 1000 + 4000 = 5000, gross = 5500
            json.dumps({
                "type": "PLANNER_RESPONSE",
                "created_at": now_iso,
                "input_tokens": 1000,
                "cache_read_tokens": 4000,
                "output_tokens": 500,
            }),
            # Missing / null / non-int / bool / negative fields -> safe 0, numeric str -> 200
            json.dumps({
                "type": "PLANNER_RESPONSE",
                "created_at": now_iso,
                "input_tokens": None,
                "cache_read_tokens": "200",
                "output_tokens": "not-a-number",
            }),
            json.dumps({
                "type": "PLANNER_RESPONSE",
                "created_at": now_iso,
                "input_tokens": True,
                "cache_read_tokens": -50,
                "output_tokens": 100,
            }),
            # Non-PLANNER_RESPONSE entry -> ignored
            json.dumps({
                "type": "TOOL_RESULT",
                "created_at": now_iso,
                "input_tokens": 99999,
            }),
            # Non-dict JSON & invalid JSON -> ignored without crash
            "[]",
            "\"plain-string\"",
            "12345",
            "{broken json",
            "",
        ]

        with tempfile.TemporaryDirectory() as tmp:
            brain_dir = Path(tmp)
            tpath = brain_dir / "conv-t2" / ".system_generated" / "logs" / "transcript.jsonl"
            tpath.parent.mkdir(parents=True, exist_ok=True)
            tpath.write_text("\n".join(lines) + "\n", encoding="utf-8")

            stats = token_tracker.parse_transcript(str(tpath))
            # 3 valid PLANNER_RESPONSE turns:
            # turn 1: ctx=5000, gross=5500
            # turn 2: ctx=200, gross=200
            # turn 3: ctx=0, gross=100
            self.assertEqual(stats["turns"], 3)
            self.assertEqual(stats["current_context"], 0)
            self.assertEqual(stats["prev_context"], 200)
            self.assertEqual(stats["delta_tokens"], -200)
            self.assertEqual(stats["total_tokens"], 5800)

            windows = token_tracker.compute_window_usage(brain_dir=brain_dir, force=True)
            self.assertEqual(windows["window_5h"]["turns"], 3)
            self.assertEqual(windows["window_5h"]["tokens"], 5800)
            self.assertEqual(windows["window_7d"]["turns"], 3)
            self.assertEqual(windows["window_7d"]["tokens"], 5800)

            bar = token_tracker.build_status_line(stats, token_tracker.DEFAULT_CONFIG)
            self.assertIn("Ngữ cảnh:", bar)
            self.assertIn("ngưỡng", bar)
            self.assertIn("Tổng phiên (local):", bar)


class TestT3CompactionAndNoForecast(unittest.TestCase):
    """T3: Signed delta on compaction; avg_delta and est_turns_left removed."""

    def setUp(self):
        token_tracker.clear_parse_cache()

    def test_compaction_negative_delta_and_removed_forecast_fields(self):
        turns_data = [
            {"type": "PLANNER_RESPONSE", "input_tokens": 10000, "cache_read_tokens": 40000, "output_tokens": 1000},
            {"type": "PLANNER_RESPONSE", "input_tokens": 20000, "cache_read_tokens": 70000, "output_tokens": 1500},
            {"type": "PLANNER_RESPONSE", "input_tokens": 5000, "cache_read_tokens": 25000, "output_tokens": 800},
        ]
        with tempfile.TemporaryDirectory() as tmp:
            tpath = Path(tmp) / "transcript.jsonl"
            tpath.write_text("\n".join(json.dumps(x) for x in turns_data) + "\n", encoding="utf-8")

            stats = token_tracker.parse_transcript(str(tpath))
            self.assertEqual(stats["turns"], 3)
            self.assertEqual(stats["prev_context"], 90000)
            self.assertEqual(stats["current_context"], 30000)
            self.assertEqual(stats["delta_tokens"], -60000)
            self.assertFalse(stats["is_spike"])
            self.assertNotIn("avg_delta", stats)
            self.assertNotIn("est_turns_left", stats)

    def test_panel_html_removed_forecast_and_has_truthful_labels(self):
        html = (PLUGIN_DIR / "ui" / "panel.html").read_text(encoding="utf-8")
        self.assertNotIn("statLeft", html)
        self.assertNotIn("est_turns_left", html)
        self.assertIn("Tổng phiên (local)", html)
        self.assertIn("Local 5 giờ", html)
        self.assertIn("Local 7 ngày", html)
        self.assertIn("ngưỡng", html)


class TestT4ParseCache(unittest.TestCase):
    """T4: In-memory cache keyed by (path, mtime_ns, size) skips repeat reads & invalidates on change."""

    def setUp(self):
        token_tracker.clear_parse_cache()

    def test_cache_hit_and_invalidation(self):
        with tempfile.TemporaryDirectory() as tmp:
            tpath = Path(tmp) / "transcript.jsonl"
            tpath.write_text(
                json.dumps({"type": "PLANNER_RESPONSE", "input_tokens": 1000, "cache_read_tokens": 2000, "output_tokens": 300}) + "\n",
                encoding="utf-8",
            )

            real_open = Path.open
            open_calls = 0

            def counting_open(self_path, *args, **kwargs):
                nonlocal open_calls
                if self_path == tpath:
                    open_calls += 1
                return real_open(self_path, *args, **kwargs)

            with mock.patch.object(Path, "open", counting_open):
                s1 = token_tracker.parse_transcript(str(tpath))
                s1["mutated_by_caller"] = True
                s2 = token_tracker.parse_transcript(str(tpath))

                self.assertEqual(open_calls, 1)
                self.assertEqual(s2["current_context"], 3000)
                self.assertNotIn("mutated_by_caller", s2)

                # Mutate file content (changes size and mtime_ns)
                with real_open(tpath, "a", encoding="utf-8") as f:
                    f.write(
                        json.dumps({"type": "PLANNER_RESPONSE", "input_tokens": 4000, "cache_read_tokens": 5000, "output_tokens": 500}) + "\n"
                    )
                st = tpath.stat()
                os.utime(tpath, ns=(st.st_atime_ns, st.st_mtime_ns + 1_000_000))

                s3 = token_tracker.parse_transcript(str(tpath))
                self.assertEqual(open_calls, 2)
                self.assertEqual(s3["turns"], 2)
                self.assertEqual(s3["current_context"], 9000)
                self.assertEqual(s3["delta_tokens"], 6000)


class TestT5InstallerPreservation(unittest.TestCase):
    """T5: PowerShell & Bash installers preserve nonempty custom config in normal mode, overwrite in force mode."""

    def _create_working_tree_git_mirror(self, base_dir: Path) -> Path:
        mirror = base_dir / "repo-mirror"
        dst_plugin = mirror / ".agents" / "plugins" / "token-guard"
        shutil.copytree(PLUGIN_DIR, dst_plugin, ignore=shutil.ignore_patterns(".state", "__pycache__"))
        subprocess.run(["git", "init", "-q"], cwd=mirror, check=True)
        subprocess.run(["git", "config", "user.email", "test@local"], cwd=mirror, check=True)
        subprocess.run(["git", "config", "user.name", "Test"], cwd=mirror, check=True)
        subprocess.run(["git", "add", "."], cwd=mirror, check=True)
        subprocess.run(["git", "commit", "-q", "-m", "snapshot"], cwd=mirror, check=True)
        return mirror

    def _make_git_override_env(self, base_env: dict, mirror: Path) -> dict:
        env = dict(base_env)
        env["GIT_CONFIG_COUNT"] = "1"
        env["GIT_CONFIG_KEY_0"] = f"url.{mirror.as_posix()}.insteadOf"
        env["GIT_CONFIG_VALUE_0"] = "https://github.com/blamag999/agent-workflow-template.git"
        return env

    @unittest.skipUnless(os.name == "nt", "PowerShell installer smoke requires Windows")
    def test_powershell_installer_normal_and_force(self):
        ps_script = REPO_ROOT / "scripts" / "install-token-guard.ps1"
        custom_cfg = '{\n  "warn_threshold": 55555,\n  "red_threshold_mode": "suggest"\n}\n'

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            mirror = self._create_working_tree_git_mirror(tmp_path)
            fake_home = tmp_path / "home"
            target_cfg = fake_home / ".gemini" / "config" / "plugins" / "token-guard" / "config.json"
            target_cfg.parent.mkdir(parents=True, exist_ok=True)
            target_cfg.write_text(custom_cfg, encoding="utf-8")

            env = self._make_git_override_env(os.environ, mirror)
            env["USERPROFILE"] = str(fake_home)

            # Normal mode -> preserves custom config
            res_norm = subprocess.run(
                ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(ps_script)],
                env=env,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(res_norm.returncode, 0, msg=res_norm.stderr + res_norm.stdout)
            self.assertEqual(target_cfg.read_text(encoding="utf-8"), custom_cfg)

            # Force mode -> replaces with repo default config
            res_force = subprocess.run(
                ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(ps_script), "-Force"],
                env=env,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(res_force.returncode, 0, msg=res_force.stderr + res_force.stdout)
            installed_cfg = json.loads(target_cfg.read_text(encoding="utf-8"))
            self.assertEqual(installed_cfg["warn_threshold"], 80000)
            self.assertEqual(installed_cfg["red_threshold_mode"], "suggest")

    def test_bash_installer_normal_and_force(self):
        bash_bin = shutil.which("bash")
        if not bash_bin and os.name == "nt":
            candidate = Path(r"C:\Program Files\Git\bin\bash.exe")
            if candidate.is_file():
                bash_bin = str(candidate)
        if not bash_bin:
            self.skipTest("bash executable not available in this environment")

        sh_script = REPO_ROOT / "scripts" / "install-token-guard.sh"
        custom_cfg = '{\n  "warn_threshold": 66666,\n  "red_threshold_mode": "suggest"\n}\n'

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            mirror = self._create_working_tree_git_mirror(tmp_path)
            fake_home = tmp_path / "home"
            target_cfg = fake_home / ".gemini" / "config" / "plugins" / "token-guard" / "config.json"
            target_cfg.parent.mkdir(parents=True, exist_ok=True)
            target_cfg.write_text(custom_cfg, encoding="utf-8")

            env = self._make_git_override_env(os.environ, mirror)
            env["HOME"] = fake_home.as_posix()

            # Normal mode -> preserves custom config
            res_norm = subprocess.run(
                [bash_bin, sh_script.as_posix()],
                env=env,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(res_norm.returncode, 0, msg=res_norm.stderr + res_norm.stdout)
            self.assertEqual(target_cfg.read_text(encoding="utf-8").strip(), custom_cfg.strip())

            # Force mode -> replaces with repo default config
            res_force = subprocess.run(
                [bash_bin, sh_script.as_posix(), "--force"],
                env=env,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(res_force.returncode, 0, msg=res_force.stderr + res_force.stdout)
            installed_cfg = json.loads(target_cfg.read_text(encoding="utf-8"))
            self.assertEqual(installed_cfg["warn_threshold"], 80000)
            self.assertEqual(installed_cfg["red_threshold_mode"], "suggest")


class TestMcpServerCompatibility(unittest.TestCase):
    """Lightweight MCP server JSON-RPC smoke."""

    def _call(self, req: dict) -> dict:
        buf = io.StringIO()
        with mock.patch.object(sys, "stdout", buf):
            mcp_server.handle_request(req)
        return json.loads(buf.getvalue().strip())

    def test_initialize_and_resources_and_tools(self):
        init_res = self._call({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}})
        self.assertEqual(init_res["result"]["serverInfo"]["version"], "2.1.0")

        res_read = self._call({
            "jsonrpc": "2.0",
            "id": 2,
            "method": "resources/read",
            "params": {"uri": mcp_server.APP_URI},
        })
        html = res_read["result"]["contents"][0]["text"]
        self.assertIn("Token Guard", html)
        self.assertNotIn("statLeft", html)


if __name__ == "__main__":
    unittest.main(verbosity=2)
