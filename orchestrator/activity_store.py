"""数字员工运行监控 / 审计的活动记录存储（SQLite，与 standards 同库）。

落盘两类：审批审计（危险命令 approval）+ 会话任务标题（编排层在创建会话时写入，
用于运行监控里展示一句完整的「任务」描述，替代 harness 自动截断的 title）。
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
        conn.execute(
            "CREATE TABLE IF NOT EXISTS session_meta ("
            "session_id TEXT PRIMARY KEY, "
            "title TEXT NOT NULL, "
            "stage TEXT NOT NULL"
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


def record_session_title(session_id: str, title: str, stage: str) -> None:
    """记录某会话的干净任务标题（编排层创建会话时写入，UPSERT）。"""
    conn = _conn()
    try:
        conn.execute(
            "INSERT INTO session_meta(session_id, title, stage) VALUES(?,?,?) "
            "ON CONFLICT(session_id) DO UPDATE SET title=excluded.title, stage=excluded.stage",
            (session_id, title, stage),
        )
        conn.commit()
    finally:
        conn.close()


def get_session_title(session_id: str) -> str | None:
    """读某会话的干净任务标题；未记录（如子代理 session / 历史 session）返回 None。"""
    conn = _conn()
    try:
        row = conn.execute("SELECT title FROM session_meta WHERE session_id=?", (session_id,)).fetchone()
        return row["title"] if row else None
    finally:
        conn.close()
