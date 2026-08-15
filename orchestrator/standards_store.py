"""标准集中存储：SQLite。

多个 harness 通过 streamable-http MCP 连同一个 server（orchestrator 8080），
server 读这一份 SQLite，所以「标准定义」集中在一处，不落在各 harness 本地文件。

首次启动从 standards/*.md 导入种子数据；之后以 SQLite 为准（UI/CRUD/MCP 都读写它）。
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "standards.db"
STAGES = ["requirements", "design", "tasks", "coding", "testing"]


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(seed_dir: str | None = None) -> None:
    conn = _conn()
    try:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS standards ("
            "stage TEXT NOT NULL, name TEXT NOT NULL, content TEXT NOT NULL, "
            "PRIMARY KEY (stage, name))",
        )
        count = conn.execute("SELECT COUNT(*) AS c FROM standards").fetchone()["c"]
        if count == 0 and seed_dir and os.path.isdir(seed_dir):
            for stage in STAGES:
                d = os.path.join(seed_dir, stage)
                if not os.path.isdir(d):
                    continue
                for f in sorted(os.listdir(d)):
                    if not f.endswith(".md"):
                        continue
                    with open(os.path.join(d, f), encoding="utf-8") as fh:
                        content = fh.read()
                    conn.execute(
                        "INSERT OR IGNORE INTO standards(stage, name, content) VALUES(?,?,?)",
                        (stage, f, content),
                    )
        conn.commit()
    finally:
        conn.close()


def list_stages() -> list[dict]:
    conn = _conn()
    try:
        out = []
        for stage in STAGES:
            rows = conn.execute(
                "SELECT name FROM standards WHERE stage=? ORDER BY name", (stage,),
            ).fetchall()
            out.append({"stage": stage, "files": [r["name"] for r in rows]})
        return out
    finally:
        conn.close()


def read(stage: str, name: str) -> str | None:
    conn = _conn()
    try:
        row = conn.execute(
            "SELECT content FROM standards WHERE stage=? AND name=?", (stage, name),
        ).fetchone()
        return row["content"] if row else None
    finally:
        conn.close()


def write(stage: str, name: str, content: str) -> None:
    conn = _conn()
    try:
        conn.execute(
            "INSERT INTO standards(stage, name, content) VALUES(?,?,?) "
            "ON CONFLICT(stage, name) DO UPDATE SET content=excluded.content",
            (stage, name, content),
        )
        conn.commit()
    finally:
        conn.close()


def delete(stage: str, name: str) -> bool:
    conn = _conn()
    try:
        cur = conn.execute("DELETE FROM standards WHERE stage=? AND name=?", (stage, name))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def search(keyword: str) -> list[str]:
    conn = _conn()
    try:
        rows = conn.execute(
            "SELECT stage, name, content FROM standards ORDER BY stage, name",
        ).fetchall()
        hits = []
        low = keyword.lower()
        for r in rows:
            if low in r["content"].lower():
                matched = [ln.strip() for ln in r["content"].splitlines() if low in ln.lower()]
                hits.append(f"{r['stage']}/{r['name']}: " + " | ".join(matched[:3]))
        return hits
    finally:
        conn.close()


def get_all(stage: str) -> list[tuple[str, str, str]]:
    """返回 (name, title, summary)，供 MCP list_stage_standards。"""
    conn = _conn()
    try:
        rows = conn.execute(
            "SELECT name, content FROM standards WHERE stage=? ORDER BY name", (stage,),
        ).fetchall()
        out = []
        for r in rows:
            out.append((r["name"], *_head(r["content"])))
        return out
    finally:
        conn.close()


def _head(content: str) -> tuple[str, str]:
    lines = content.splitlines()
    title = ""
    body: list[str] = []
    for ln in lines:
        if ln.startswith("# "):
            title = ln[2:].strip()
            continue
        body.append(ln)
    return title, "\n".join(body).strip()[:200]
