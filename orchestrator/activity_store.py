"""数字员工运行监控 / 审计的活动记录存储（SQLite，与 standards 同库）。

当前落盘「审批审计」（危险命令 approval）；运行监控用 session.list 实时聚合，不落盘。
"""

from __future__ import annotations

import sqlite3
import time
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
            "CREATE TABLE IF NOT EXISTS activity ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "session_id TEXT NOT NULL, "
            "agent TEXT NOT NULL, "
            "ts INTEGER NOT NULL, "
            "kind TEXT NOT NULL, "
            "detail TEXT NOT NULL, "
            "outcome TEXT NOT NULL"
            ")",
        )
        conn.commit()
    finally:
        conn.close()


def record_approval(session_id: str, agent: str, tool_name: str, reason: str, outcome: str) -> None:
    """记录一条审批审计：某数字员工请求执行危险命令，结果是批准/拒绝。"""
    conn = _conn()
    try:
        conn.execute(
            "INSERT INTO activity(session_id, agent, ts, kind, detail, outcome) VALUES(?,?,?,?,?,?)",
            (session_id, agent, int(time.time() * 1000), "approval",
             f"请求执行命令：{tool_name}" + (f"（{reason[:120]}）" if reason else ""),
             outcome),
        )
        conn.commit()
    finally:
        conn.close()


def list_activity(kind: str | None = None, limit: int = 100) -> list[dict]:
    conn = _conn()
    try:
        if kind:
            rows = conn.execute(
                "SELECT * FROM activity WHERE kind=? ORDER BY ts DESC LIMIT ?", (kind, limit),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM activity ORDER BY ts DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
