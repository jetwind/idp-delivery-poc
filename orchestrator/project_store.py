"""交付项目/版本管理存储（SQLite，与 standards 同库）。

一个「项目」对应一个客户/系统（长期存在），项目下挂多个「版本」——
每次交付迭代（含客户新需求）建一个新版本，基于上一版本的 git 基线继续。
版本是进入流水线的入口：每个版本有自己的 requirement_text 与 thread_id。
"""

from __future__ import annotations

import re
import sqlite3
import time
import uuid
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "standards.db"

VERSION_STATUS = ["进行中", "已交付", "已归档"]


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
            "current_version_id TEXT, "
            "created_at INTEGER NOT NULL, "
            "updated_at INTEGER NOT NULL"
            ")",
        )
        conn.execute(
            "CREATE TABLE IF NOT EXISTS versions ("
            "id TEXT PRIMARY KEY, "
            "project_id TEXT NOT NULL, "
            "name TEXT NOT NULL, "
            "requirement_text TEXT NOT NULL, "
            "thread_id TEXT, "
            "stage_index INTEGER DEFAULT 0, "
            "status TEXT NOT NULL DEFAULT '进行中', "
            "git_ref TEXT, "
            "note TEXT DEFAULT '', "
            "created_at INTEGER NOT NULL, "
            "updated_at INTEGER NOT NULL"
            ")",
        )
        # 兼容旧库：补 current_version_id 列。
        cols = [r["name"] for r in conn.execute("PRAGMA table_info(projects)").fetchall()]
        if "current_version_id" not in cols:
            conn.execute("ALTER TABLE projects ADD COLUMN current_version_id TEXT")
        # 迁移：老项目（无版本记录）→ 补一个 v1.0.0 版本，挂接其旧 thread/需求。
        projects = conn.execute("SELECT * FROM projects").fetchall()
        for p in projects:
            has = conn.execute(
                "SELECT 1 FROM versions WHERE project_id=? LIMIT 1", (p["id"],),
            ).fetchone()
            if has:
                continue
            now = _now()
            vid = "v" + uuid.uuid4().hex[:12]
            conn.execute(
                "INSERT INTO versions(id, project_id, name, requirement_text, thread_id, stage_index, status, created_at, updated_at) "
                "VALUES(?,?,?,?,?,?,?,?,?)",
                (vid, p["id"], "v1.0.0", p["requirement_text"], p["thread_id"], p["stage_index"] or 0, "进行中", now, now),
            )
            conn.execute("UPDATE projects SET current_version_id=? WHERE id=?", (vid, p["id"]))
        conn.commit()
    finally:
        conn.close()


def _now() -> int:
    return int(time.time() * 1000)


def _parse_version(name: str) -> tuple[int, int, int]:
    m = re.match(r"^v?(\d+)\.(\d+)\.(\d+)$", name.strip())
    if not m:
        return (1, 0, 0)
    return int(m.group(1)), int(m.group(2)), int(m.group(3))


def create_project(name: str, requirement_text: str, cwd: str) -> dict:
    pid = "p" + uuid.uuid4().hex[:12]
    vid = "v" + uuid.uuid4().hex[:12]
    now = _now()
    conn = _conn()
    try:
        conn.execute(
            "INSERT INTO projects(id, name, requirement_text, cwd, current_version_id, created_at, updated_at) "
            "VALUES(?,?,?,?,?,?,?)",
            (pid, name, requirement_text, cwd, vid, now, now),
        )
        conn.execute(
            "INSERT INTO versions(id, project_id, name, requirement_text, thread_id, stage_index, status, created_at, updated_at) "
            "VALUES(?,?,?,?,NULL,0,'进行中',?,?)",
            (vid, pid, "v1.0.0", requirement_text, now, now),
        )
        conn.commit()
    finally:
        conn.close()
    return get_project(pid)  # type: ignore[return-value]


def list_projects() -> list[dict]:
    conn = _conn()
    try:
        rows = conn.execute("SELECT * FROM projects ORDER BY updated_at DESC").fetchall()
        out = []
        for r in rows:
            d = dict(r)
            cur = conn.execute(
                "SELECT * FROM versions WHERE id=?", (r["current_version_id"],),
            ).fetchone() if r["current_version_id"] else None
            d["current_version"] = dict(cur) if cur else None
            out.append(d)
        return out
    finally:
        conn.close()


def get_project(pid: str) -> dict | None:
    conn = _conn()
    try:
        row = conn.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone()
        if row is None:
            return None
        d = dict(row)
        versions = conn.execute(
            "SELECT * FROM versions WHERE project_id=? ORDER BY created_at DESC", (pid,),
        ).fetchall()
        d["versions"] = [dict(v) for v in versions]
        d["current_version"] = next((dict(v) for v in versions if v["id"] == d.get("current_version_id")), (dict(versions[0]) if versions else None))
        return d
    finally:
        conn.close()


def delete_project(pid: str) -> bool:
    conn = _conn()
    try:
        conn.execute("DELETE FROM versions WHERE project_id=?", (pid,))
        cur = conn.execute("DELETE FROM projects WHERE id=?", (pid,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def suggest_version_name(project_id: str) -> str:
    conn = _conn()
    try:
        row = conn.execute(
            "SELECT name FROM versions WHERE project_id=? ORDER BY created_at DESC LIMIT 1",
            (project_id,),
        ).fetchone()
        if row is None:
            return "v1.0.0"
        major, minor, _ = _parse_version(row["name"])
        return f"v{major}.{minor + 1}.0"
    finally:
        conn.close()


def create_version(project_id: str, name: str, requirement_text: str, note: str) -> dict:
    vid = "v" + uuid.uuid4().hex[:12]
    now = _now()
    name = name.strip() or suggest_version_name(project_id)
    conn = _conn()
    try:
        conn.execute(
            "INSERT INTO versions(id, project_id, name, requirement_text, thread_id, stage_index, status, git_ref, note, created_at, updated_at) "
            "VALUES(?,?,?,?,NULL,0,'进行中',NULL,?,?,?)",
            (vid, project_id, name, requirement_text, note, now, now),
        )
        conn.execute(
            "UPDATE projects SET current_version_id=?, updated_at=? WHERE id=?",
            (vid, now, project_id),
        )
        conn.commit()
    finally:
        conn.close()
    return get_version(vid)  # type: ignore[return-value]


def get_version(vid: str) -> dict | None:
    conn = _conn()
    try:
        row = conn.execute("SELECT * FROM versions WHERE id=?", (vid,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def set_version_thread(vid: str, thread_id: str, stage_index: int = 0) -> None:
    conn = _conn()
    try:
        conn.execute(
            "UPDATE versions SET thread_id=?, stage_index=?, updated_at=? WHERE id=?",
            (thread_id, stage_index, _now(), vid),
        )
        conn.commit()
    finally:
        conn.close()


def set_version_stage(vid: str, stage_index: int) -> None:
    conn = _conn()
    try:
        conn.execute(
            "UPDATE versions SET stage_index=?, updated_at=? WHERE id=?",
            (stage_index, _now(), vid),
        )
        conn.commit()
    finally:
        conn.close()


def mark_version_delivered(vid: str, git_ref: str | None = None) -> None:
    conn = _conn()
    try:
        conn.execute(
            "UPDATE versions SET status='已交付', git_ref=COALESCE(?, git_ref, name), updated_at=? WHERE id=?",
            (git_ref, _now(), vid),
        )
        conn.commit()
    finally:
        conn.close()
