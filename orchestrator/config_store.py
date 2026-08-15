"""数字员工（阶段 agent）的模型与权限配置存储。

每个阶段可指定：模型 + 思考深度（reasoningEffort）、文件权限（sandbox 三档）。
默认不配置时，走 harness 默认（deepseek-v4-pro / high / workspace-write）。
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "standards.db"

# 权限三档：harness SandboxMode（read-only / workspace-write / danger-full-access）。
PERMISSIONS = ["read-only", "workspace-write", "danger-full-access"]


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = _conn()
    try:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS agent_config ("
            "stage TEXT PRIMARY KEY, "
            "provider TEXT NOT NULL, "
            "model TEXT NOT NULL, "
            "reasoning_effort TEXT NOT NULL, "
            "permission TEXT"
            ")",
        )
        # 兼容旧表：补 permission 列。
        cols = [r["name"] for r in conn.execute("PRAGMA table_info(agent_config)").fetchall()]
        if "permission" not in cols:
            conn.execute("ALTER TABLE agent_config ADD COLUMN permission TEXT")
        conn.commit()
    finally:
        conn.close()


def get_config(stage: str) -> dict | None:
    conn = _conn()
    try:
        row = conn.execute("SELECT * FROM agent_config WHERE stage=?", (stage,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_all_configs() -> dict[str, dict]:
    conn = _conn()
    try:
        rows = conn.execute("SELECT * FROM agent_config").fetchall()
        return {r["stage"]: dict(r) for r in rows}
    finally:
        conn.close()


def set_config(stage: str, provider: str, model: str, reasoning_effort: str, permission: str | None = None) -> None:
    conn = _conn()
    try:
        conn.execute(
            "INSERT INTO agent_config(stage, provider, model, reasoning_effort, permission) VALUES(?,?,?,?,?) "
            "ON CONFLICT(stage) DO UPDATE SET provider=excluded.provider, "
            "model=excluded.model, reasoning_effort=excluded.reasoning_effort, permission=excluded.permission",
            (stage, provider, model, reasoning_effort, permission),
        )
        conn.commit()
    finally:
        conn.close()
