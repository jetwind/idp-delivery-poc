"""阶段产物 JSON Schema 存储 + jsonschema 校验。

每个阶段一份「结构化产物约定」：agent 按 schema 产出 JSON 文件，图侧用它做确定性校验。
Schema 可经 UI/接口配置（存 SQLite），未配置时用内置默认。
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import jsonschema

DB_PATH = Path(__file__).resolve().parent.parent / "standards.db"

# 阶段 → 产物 JSON 文件路径（相对 cwd）。
STAGE_OUTPUT_JSON = {
    "requirements": "specs/requirements.json",
    "design": "docs/design.json",
    "tasks": "specs/tasks.json",
    "coding": "specs/implementation.json",
    "testing": "docs/test-report.json",
}

# 内置默认 schema（01 需求为完整样板，其余阶段给最小骨架）。
DEFAULT_SCHEMAS: dict[str, dict] = {
    "requirements": {
        "title": "需求规格",
        "type": "object",
        "required": ["title", "background", "userStories", "functionalRequirements", "nonFunctional", "outOfScope"],
        "properties": {
            "title": {"type": "string", "minLength": 1},
            "background": {"type": "string", "minLength": 1},
            "userStories": {
                "type": "array", "minItems": 1,
                "items": {
                    "type": "object",
                    "required": ["role", "want", "value", "priority"],
                    "properties": {
                        "role": {"type": "string", "minLength": 1},
                        "want": {"type": "string", "minLength": 1},
                        "value": {"type": "string", "minLength": 1},
                        "priority": {"type": "string", "enum": ["must", "should", "could", "wont"]},
                    },
                },
            },
            "functionalRequirements": {
                "type": "array", "minItems": 1,
                "items": {
                    "type": "object",
                    "required": ["id", "description", "acceptanceCriteria"],
                    "properties": {
                        "id": {"type": "string", "minLength": 1},
                        "description": {"type": "string", "minLength": 1},
                        "acceptanceCriteria": {"type": "array", "minItems": 1, "items": {"type": "string", "minLength": 1}},
                    },
                },
            },
            "nonFunctional": {"type": "string"},
            "outOfScope": {"type": "array", "items": {"type": "string"}},
        },
    },
    "design": {
        "title": "详细设计",
        "type": "object",
        "required": ["modules"],
        "properties": {"modules": {"type": "array", "items": {"type": "object"}}},
    },
    "tasks": {
        "title": "任务拆解",
        "type": "object",
        "required": ["tasks"],
        "properties": {"tasks": {"type": "array", "items": {"type": "object"}}},
    },
    "coding": {
        "title": "实现说明",
        "type": "object",
        "required": ["changes"],
        "properties": {"changes": {"type": "array", "items": {"type": "object"}}},
    },
    "testing": {
        "title": "测试报告",
        "type": "object",
        "required": ["summary"],
        "properties": {"summary": {"type": "string"}},
    },
}


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = _conn()
    try:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS stage_schema ("
            "stage TEXT PRIMARY KEY, "
            "schema_json TEXT NOT NULL"
            ")",
        )
        # 种子：未配置的阶段写入默认 schema。
        for stage, schema in DEFAULT_SCHEMAS.items():
            conn.execute(
                "INSERT OR IGNORE INTO stage_schema(stage, schema_json) VALUES(?,?)",
                (stage, json.dumps(schema, ensure_ascii=False)),
            )
        conn.commit()
    finally:
        conn.close()


def get_schema(stage: str) -> dict | None:
    conn = _conn()
    try:
        row = conn.execute("SELECT schema_json FROM stage_schema WHERE stage=?", (stage,)).fetchone()
        if row:
            return json.loads(row["schema_json"])
        return DEFAULT_SCHEMAS.get(stage)
    finally:
        conn.close()


def set_schema(stage: str, schema: dict) -> None:
    conn = _conn()
    try:
        conn.execute(
            "INSERT INTO stage_schema(stage, schema_json) VALUES(?,?) "
            "ON CONFLICT(stage) DO UPDATE SET schema_json=excluded.schema_json",
            (stage, json.dumps(schema, ensure_ascii=False)),
        )
        conn.commit()
    finally:
        conn.close()


def list_schemas() -> list[dict]:
    """各阶段的 schema 摘要（stage + title + 必填字段数）。"""
    out = []
    for stage, default in DEFAULT_SCHEMAS.items():
        schema = get_schema(stage) or default
        out.append({
            "stage": stage,
            "title": schema.get("title", stage),
            "required": schema.get("required", []),
            "schema": schema,
        })
    return out


def validate_instance(schema: dict, instance) -> list[str]:
    """用 jsonschema 校验一个实例，返回错误列表（空 = 通过）。"""
    try:
        validator = jsonschema.Draft202012Validator(schema)
        errors = sorted(validator.iter_errors(instance), key=lambda e: list(e.path))
    except jsonschema.SchemaError as exc:
        return [f"schema 本身非法：{exc.message}"]
    return [f"{'/'.join(str(p) for p in e.path) or '(root)'}: {e.message}" for e in errors]
