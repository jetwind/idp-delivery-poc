"""数字员工（阶段 agent）的模型配置存储：每个阶段可指定模型 + 思考深度。

默认不配置时，走 harness 的默认模型（deepseek-v4-pro / high）。
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "standards.db"


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
            "reasoning_effort TEXT NOT NULL"
            ")",
        )
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


def set_config(stage: str, provider: str, model: str, reasoning_effort: str) -> None:
    conn = _conn()
    try:
        conn.execute(
            "INSERT INTO agent_config(stage, provider, model, reasoning_effort) VALUES(?,?,?,?) "
            "ON CONFLICT(stage) DO UPDATE SET provider=excluded.provider, "
            "model=excluded.model, reasoning_effort=excluded.reasoning_effort",
            (stage, provider, model, reasoning_effort),
        )
        conn.commit()
    finally:
        conn.close()
