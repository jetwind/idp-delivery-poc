"""数字员工运行监控 / 审计的活动记录存储（SQLite，与 standards 同库）。

落盘两类：审批审计（危险命令 approval）+ 人工 gate 确认（通过/退回，含轮次与
本轮提交的审计意见 id，供按版本回查审计链）。
"""

from __future__ import annotations

import json
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
            "outcome TEXT NOT NULL, "
            "version_id TEXT, "
            "stage TEXT, "
            "round_no INTEGER, "
            "finding_ids TEXT"
            ")",
        )
        conn.execute(
            "CREATE TABLE IF NOT EXISTS session_meta ("
            "session_id TEXT PRIMARY KEY, "
            "title TEXT NOT NULL, "
            "stage TEXT NOT NULL"
            ")",
        )
        # 迁移：补审计链列（gate 记录挂到版本/阶段/轮次/意见）。
        cols = [r["name"] for r in conn.execute("PRAGMA table_info(activity)").fetchall()]
        if "version_id" not in cols:
            conn.execute("ALTER TABLE activity ADD COLUMN version_id TEXT")
        if "stage" not in cols:
            conn.execute("ALTER TABLE activity ADD COLUMN stage TEXT")
        if "round_no" not in cols:
            conn.execute("ALTER TABLE activity ADD COLUMN round_no INTEGER")
        if "finding_ids" not in cols:
            conn.execute("ALTER TABLE activity ADD COLUMN finding_ids TEXT")
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


def record_gate(session_id: str, agent: str, action: str, feedback: str, round_no: int,
                version_id: str | None = None, stage: str | None = None,
                finding_ids: list[str] | None = None) -> None:
    """记录一次人工 gate 确认：action=approve/revise，feedback 为补充意见，round_no 为轮次。

    version_id/stage 用于按版本回查；finding_ids 为本轮提交给 agent 的审计意见 id 列表。
    """
    label = "通过" if action == "approve" else "退回"
    fb = feedback if feedback else ("无补充意见" if action == "revise" else "")
    detail = f"第{round_no}轮人工确认：{label}" + (f"——{fb}" if fb else "")
    conn = _conn()
    try:
        conn.execute(
            "INSERT INTO activity(session_id, agent, ts, kind, detail, outcome, version_id, stage, round_no, finding_ids) "
            "VALUES(?,?,?,?,?,?,?,?,?,?)",
            (session_id, agent, int(time.time() * 1000), "gate", detail, action,
             version_id, stage, round_no,
             json.dumps(finding_ids, ensure_ascii=False) if finding_ids else None),
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


def list_gate_history(version_id: str) -> list[dict]:
    """某版本的 gate 审批历史（按时间升序），finding_ids 反序列化为 list。"""
    conn = _conn()
    try:
        rows = conn.execute(
            "SELECT * FROM activity WHERE kind='gate' AND version_id=? ORDER BY ts ASC", (version_id,),
        ).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["finding_ids"] = json.loads(d["finding_ids"]) if d.get("finding_ids") else []
            out.append(d)
        return out
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
