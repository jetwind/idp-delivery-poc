"""产出文件审计意见存储（SQLite，与 standards 同库）。

记录每个版本在每个交付阶段、针对具体文件的审计意见（文件/行号/严重度/内容），
用于「文件级审计 → 驱动 agent 定向修改」的闭环，并作为版本审计留痕可回看。
"""

from __future__ import annotations

import json
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
            "ref TEXT, "
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
        # 兼容旧库：补 ref 列（JSON 产物的结构化定位，如 functionalRequirements[0]）。
        cols = [r["name"] for r in conn.execute("PRAGMA table_info(audit_findings)").fetchall()]
        if "ref" not in cols:
            conn.execute("ALTER TABLE audit_findings ADD COLUMN ref TEXT")
        # 审计留痕：append-only 变更日志（谁在何时增/改/删了哪条意见，保留 before/after）。
        conn.execute(
            "CREATE TABLE IF NOT EXISTS audit_log ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "finding_id TEXT, "
            "version_id TEXT NOT NULL, "
            "stage TEXT NOT NULL, "
            "action TEXT NOT NULL, "
            "before_json TEXT, "
            "after_json TEXT, "
            "ts INTEGER NOT NULL"
            ")",
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


def _log(conn: sqlite3.Connection, finding_id: str | None, version_id: str, stage: str,
         action: str, before: dict | None, after: dict | None) -> None:
    conn.execute(
        "INSERT INTO audit_log(finding_id, version_id, stage, action, before_json, after_json, ts) "
        "VALUES(?,?,?,?,?,?,?)",
        (finding_id, version_id, stage, action,
         json.dumps(before, ensure_ascii=False) if before else None,
         json.dumps(after, ensure_ascii=False) if after else None,
         _now()),
    )


def create_finding(version_id: str, stage: str, path: str, line: int | None, ref: str | None,
                   severity: str, comment: str) -> dict:
    fid = "a" + uuid.uuid4().hex[:12]
    now = _now()
    conn = _conn()
    try:
        conn.execute(
            "INSERT INTO audit_findings(id, version_id, stage, path, line, ref, severity, comment, status, created_at, updated_at) "
            "VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            (fid, version_id, stage, path, line, ref, severity, comment, "open", now, now),
        )
        after = dict(conn.execute("SELECT * FROM audit_findings WHERE id=?", (fid,)).fetchone())
        _log(conn, fid, version_id, stage, "create", None, after)
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
    allowed = {"line", "ref", "severity", "comment", "status"}
    updates = {k: v for k, v in fields.items() if k in allowed and v is not None}
    if not updates:
        return get_finding(fid)
    before = get_finding(fid)
    if before is None:
        return None
    updates["updated_at"] = _now()
    cols = ", ".join(f"{k}=?" for k in updates)
    values = list(updates.values()) + [fid]
    conn = _conn()
    try:
        conn.execute(f"UPDATE audit_findings SET {cols} WHERE id=?", values)
        after = dict(conn.execute("SELECT * FROM audit_findings WHERE id=?", (fid,)).fetchone())
        _log(conn, fid, before["version_id"], before["stage"], "update", before, after)
        conn.commit()
    finally:
        conn.close()
    return get_finding(fid)


def delete_finding(fid: str) -> bool:
    before = get_finding(fid)
    if before is None:
        return False
    conn = _conn()
    try:
        cur = conn.execute("DELETE FROM audit_findings WHERE id=?", (fid,))
        _log(conn, fid, before["version_id"], before["stage"], "delete", before, None)
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def list_log(version_id: str, limit: int = 200) -> list[dict]:
    """某版本的审计意见变更日志（append-only 留痕），按时间倒序。"""
    conn = _conn()
    try:
        rows = conn.execute(
            "SELECT * FROM audit_log WHERE version_id=? ORDER BY ts DESC LIMIT ?", (version_id, limit),
        ).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["before"] = json.loads(d["before_json"]) if d.get("before_json") else None
            d["after"] = json.loads(d["after_json"]) if d.get("after_json") else None
            out.append(d)
        return out
    finally:
        conn.close()
