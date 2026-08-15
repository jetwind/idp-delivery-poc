"""交付项目管理存储（SQLite，与 standards 同库）。

每个「项目」对应一次 AI 交付：名称 + 原始需求 + 工作目录 + 流水线 thread_id。
项目是进入流水线的入口，thread_id 用于继续（resume）已存在的流程。
"""

from __future__ import annotations

import sqlite3
import time
import uuid
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
            "CREATE TABLE IF NOT EXISTS projects ("
            "id TEXT PRIMARY KEY, "
            "name TEXT NOT NULL, "
            "requirement_text TEXT NOT NULL, "
            "cwd TEXT NOT NULL, "
            "thread_id TEXT, "
            "stage_index INTEGER DEFAULT 0, "
            "created_at INTEGER NOT NULL, "
            "updated_at INTEGER NOT NULL"
            ")",
        )
        conn.commit()
    finally:
        conn.close()


def _now() -> int:
    return int(time.time() * 1000)


def create_project(name: str, requirement_text: str, cwd: str) -> dict:
    pid = "p" + uuid.uuid4().hex[:12]
    now = _now()
    conn = _conn()
    try:
        conn.execute(
            "INSERT INTO projects(id, name, requirement_text, cwd, thread_id, stage_index, created_at, updated_at) "
            "VALUES(?,?,?,?,NULL,0,?,?)",
            (pid, name, requirement_text, cwd, now, now),
        )
        conn.commit()
    finally:
        conn.close()
    return get_project(pid)  # type: ignore[return-value]


def list_projects() -> list[dict]:
    conn = _conn()
    try:
        rows = conn.execute("SELECT * FROM projects ORDER BY updated_at DESC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_project(pid: str) -> dict | None:
    conn = _conn()
    try:
        row = conn.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def delete_project(pid: str) -> bool:
    conn = _conn()
    try:
        cur = conn.execute("DELETE FROM projects WHERE id=?", (pid,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def set_thread(pid: str, thread_id: str, stage_index: int = 0) -> None:
    conn = _conn()
    try:
        conn.execute(
            "UPDATE projects SET thread_id=?, stage_index=?, updated_at=? WHERE id=?",
            (thread_id, stage_index, _now(), pid),
        )
        conn.commit()
    finally:
        conn.close()


def set_stage(pid: str, stage_index: int) -> None:
    conn = _conn()
    try:
        conn.execute(
            "UPDATE projects SET stage_index=?, updated_at=? WHERE id=?",
            (stage_index, _now(), pid),
        )
        conn.commit()
    finally:
        conn.close()
