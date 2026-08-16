"""产出文件审计意见存储（SQLite，与 standards 同库）。

记录每个版本在每个交付阶段、针对具体文件的审计意见（文件/行号/严重度/内容），
用于「文件级审计 → 驱动 agent 定向修改」的闭环，并作为版本审计留痕可回看。
"""

from __future__ import annotations

import sqlite3
import time
import uuid
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "standards.db"

SEVERITY = ["blocking", "suggestion"]
STATUS = ["open", "resolved"]


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _now() -> int:
    return int(time.time() * 1000)


def init_db() -> None:
    conn = _conn()
    try:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS audit_findings ("
            "id TEXT PRIMARY KEY, "
            "version_id TEXT NOT NULL, "
            "stage TEXT NOT NULL, "
            "path TEXT NOT NULL, "
            "line INTEGER, "
            "severity TEXT NOT NULL, "
            "comment TEXT NOT NULL, "
            "status TEXT NOT NULL DEFAULT 'open', "
            "created_at INTEGER NOT NULL, "
            "updated_at INTEGER NOT NULL"
            ")",
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_audit_version_stage ON audit_findings(version_id, stage)",
        )
        conn.commit()
    finally:
        conn.close()


def list_findings(version_id: str, stage: str | None = None) -> list[dict]:
    conn = _conn()
    try:
        if stage:
            rows = conn.execute(
                "SELECT * FROM audit_findings WHERE version_id=? AND stage=? ORDER BY path, line, created_at",
                (version_id, stage),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM audit_findings WHERE version_id=? ORDER BY stage, path, line, created_at",
                (version_id,),
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create_finding(version_id: str, stage: str, path: str, line: int | None,
                   severity: str, comment: str) -> dict:
    fid = "a" + uuid.uuid4().hex[:12]
    now = _now()
    conn = _conn()
    try:
        conn.execute(
            "INSERT INTO audit_findings(id, version_id, stage, path, line, severity, comment, status, created_at, updated_at) "
            "VALUES(?,?,?,?,?,?,?,?,?,?)",
            (fid, version_id, stage, path, line, severity, comment, "open", now, now),
        )
        conn.commit()
    finally:
        conn.close()
    return get_finding(fid)  # type: ignore[return-value]


def get_finding(fid: str) -> dict | None:
    conn = _conn()
    try:
        row = conn.execute("SELECT * FROM audit_findings WHERE id=?", (fid,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def update_finding(fid: str, **fields: object) -> dict | None:
    allowed = {"line", "severity", "comment", "status"}
    updates = {k: v for k, v in fields.items() if k in allowed and v is not None}
    if not updates:
        return get_finding(fid)
    updates["updated_at"] = _now()
    cols = ", ".join(f"{k}=?" for k in updates)
    values = list(updates.values()) + [fid]
    conn = _conn()
    try:
        conn.execute(f"UPDATE audit_findings SET {cols} WHERE id=?", values)
        conn.commit()
    finally:
        conn.close()
    return get_finding(fid)


def delete_finding(fid: str) -> bool:
    conn = _conn()
    try:
        cur = conn.execute("DELETE FROM audit_findings WHERE id=?", (fid,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
