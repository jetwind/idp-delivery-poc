"""数字员工（阶段 agent）的模型/权限/验收重试配置存储。

每个阶段可指定：模型 + 思考深度（reasoningEffort）、文件权限（sandbox 三档）、
产物校验失败后的重试次数（max_retries，未配置时用 DEFAULT_MAX_RETRIES）。
默认不配置时，走 harness 默认（deepseek-v4-pro / high / workspace-write）。
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "standards.db"

# 权限三档：harness SandboxMode（read-only / workspace-write / danger-full-access）。
PERMISSIONS = ["read-only", "workspace-write", "danger-full-access"]

# 产物校验（schema + 04/05 命令验收）失败后的重试次数默认值，每阶段可覆盖。
DEFAULT_MAX_RETRIES = 2
MAX_RETRIES_CAP = 10


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
            "permission TEXT, "
            "max_retries INTEGER"
            ")",
        )
        # 兼容旧表：补 permission / max_retries 列。
        cols = [r["name"] for r in conn.execute("PRAGMA table_info(agent_config)").fetchall()]
        if "permission" not in cols:
            conn.execute("ALTER TABLE agent_config ADD COLUMN permission TEXT")
        if "max_retries" not in cols:
            conn.execute("ALTER TABLE agent_config ADD COLUMN max_retries INTEGER")
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


def set_config(stage: str, provider: str, model: str, reasoning_effort: str, permission: str | None = None, max_retries: int | None = None) -> None:
    conn = _conn()
    try:
        conn.execute(
            "INSERT INTO agent_config(stage, provider, model, reasoning_effort, permission, max_retries) "
            "VALUES(?,?,?,?,?,?) "
            "ON CONFLICT(stage) DO UPDATE SET provider=excluded.provider, "
            "model=excluded.model, reasoning_effort=excluded.reasoning_effort, "
            "permission=excluded.permission, max_retries=excluded.max_retries",
            (stage, provider, model, reasoning_effort, permission, max_retries),
        )
        conn.commit()
    finally:
        conn.close()


def get_max_retries(stage: str) -> int:
    """该阶段产物校验失败后的重试次数；未配置或非法时回退默认值。"""
    cfg = get_config(stage)
    val = (cfg or {}).get("max_retries")
    if isinstance(val, int) and 0 <= val <= MAX_RETRIES_CAP:
        return val
    return DEFAULT_MAX_RETRIES
