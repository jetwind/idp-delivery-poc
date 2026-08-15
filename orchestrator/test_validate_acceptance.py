"""集成验证：validate_node 边把 schema 校验 + 04/05 命令验收串起来。

用真实临时项目（Node 脚本，无外部依赖）验证 coding/testing 的「通过」与
「失败→重试」路径，不依赖 harness（client 用最小 mock，仅重试路径会调用 prompt）。
"""

from __future__ import annotations

import asyncio
import json
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from graph import validate_node  # noqa: E402


class MockClient:
    def __init__(self) -> None:
        self.prompts: list[str] = []

    async def prompt(self, session_id: str, text: str) -> None:
        self.prompts.append(text)


def mkproject(tmp: str) -> None:
    Path(tmp, "index.js").write_text(
        "module.exports = function trace(id) { return 'T-' + id; };\n", encoding="utf-8",
    )
    Path(tmp, "test.js").write_text(
        "const t = require('./index'); if (t('x') !== 'T-x') process.exit(1); console.log('ok');\n",
        encoding="utf-8",
    )
    Path(tmp, "package.json").write_text(
        json.dumps({"name": "demo", "version": "1.0.0", "scripts": {"test": "node test.js"}}),
        encoding="utf-8",
    )
    Path(tmp, "specs").mkdir(exist_ok=True)
    Path(tmp, "docs").mkdir(exist_ok=True)


def coding_instance(build: str, test: str) -> dict:
    return {
        "changes": [{"taskId": "T1", "description": "实现追溯码函数", "verification": "node --check"}],
        "buildCommand": build,
        "testCommand": test,
        "services": ["svc"],
    }


def testing_instance(command: str, failed: int) -> dict:
    return {
        "summary": "单元测试通过",
        "unitTest": {"command": command, "total": 1, "passed": 1 - failed, "failed": failed},
        "defects": [],
    }


async def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        mkproject(tmp)

        # 04 编码：schema 通过 + 命令通过。
        Path(tmp, "specs", "implementation.json").write_text(
            json.dumps(coding_instance("node --check index.js", "npm test"), ensure_ascii=False),
            encoding="utf-8",
        )
        st = {"cwd": tmp, "stage_index": 3, "current_session_id": "s1", "validation_attempts": 0}
        await validate_node(st, MockClient())
        print(f"✅ coding 通过路径 status={st.get('validation_status')}（期望 passed）")
        assert st.get("validation_status") == "passed", st

        # 04 编码：build 命令失败 → retrying + 反馈 prompt。
        Path(tmp, "specs", "implementation.json").write_text(
            json.dumps(coding_instance("node --check nope.js", "npm test"), ensure_ascii=False),
            encoding="utf-8",
        )
        st2 = {"cwd": tmp, "stage_index": 3, "current_session_id": "s2", "validation_attempts": 0}
        cli = MockClient()
        await validate_node(st2, cli)
        print(f"✅ coding 失败路径 status={st2.get('validation_status')} attempts={st2.get('validation_attempts')}（期望 retrying/1）")
        assert st2.get("validation_status") == "retrying"
        assert st2.get("validation_attempts") == 1
        assert len(cli.prompts) == 1 and "命令" in cli.prompts[0]

        # 05 测试：schema 通过 + npm test 通过 + failed=0。
        Path(tmp, "docs", "test-report.json").write_text(
            json.dumps(testing_instance("npm test", 0), ensure_ascii=False), encoding="utf-8",
        )
        st3 = {"cwd": tmp, "stage_index": 4, "current_session_id": "s3", "validation_attempts": 0}
        await validate_node(st3, MockClient())
        print(f"✅ testing 通过路径 status={st3.get('validation_status')}（期望 passed）")
        assert st3.get("validation_status") == "passed", st3

        # 05 测试：自报 failed>0 → retrying（不信 agent 自报）。
        Path(tmp, "docs", "test-report.json").write_text(
            json.dumps(testing_instance("npm test", 1), ensure_ascii=False), encoding="utf-8",
        )
        st4 = {"cwd": tmp, "stage_index": 4, "current_session_id": "s4", "validation_attempts": 0}
        await validate_node(st4, MockClient())
        print(f"✅ testing 自报失败路径 status={st4.get('validation_status')}（期望 retrying）")
        assert st4.get("validation_status") == "retrying"

    print("\n集成验证通过。")


if __name__ == "__main__":
    asyncio.run(main())
