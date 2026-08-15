"""确定性验收单测：04 编码 / 05 测试的命令验收（铁律 3）。

不依赖 harness：直接调用 graph.run_command_acceptance，用假命令验证
「完成」由真实命令退出码判定——通过、失败、failed>0、空命令四类路径。
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from graph import run_command_acceptance  # noqa: E402


def check(name: str, got: list[str], expect_count: int, expect_fragment: str | None = None) -> None:
    ok = len(got) == expect_count
    detail = "\n".join(f"  - {e}" for e in got)
    if ok and expect_fragment and not any(expect_fragment in e for e in got):
        ok = False
    print(f"{'✅' if ok else '❌'} {name}: 错误数={len(got)}（期望 {expect_count}）")
    if detail:
        print(detail)
    assert ok, f"{name} 断言失败"


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        cwd = str(Path(tmp))

        # 04 编码：build/test 都通过。
        check(
            "coding 通过",
            run_command_acceptance("coding", cwd, {
                "buildCommand": "exit 0",
                "testCommand": "exit 0",
                "services": ["svc"],
            }),
            0,
        )

        # 04 编码：build 失败（退出码非 0）。
        check(
            "coding 构建失败",
            run_command_acceptance("coding", cwd, {
                "buildCommand": "exit 7",
                "testCommand": "exit 0",
                "services": ["svc"],
            }),
            1,
            "退出码非 0（7）",
        )

        # 04 编码：命令为空。
        check(
            "coding 命令为空",
            run_command_acceptance("coding", cwd, {
                "buildCommand": "",
                "testCommand": "exit 0",
                "services": ["svc"],
            }),
            1,
            "为空",
        )

        # 05 测试：命令通过且 failed=0。
        check(
            "testing 通过",
            run_command_acceptance("testing", cwd, {
                "unitTest": {"command": "exit 0", "total": 3, "passed": 3, "failed": 0},
            }),
            0,
        )

        # 05 测试：命令通过但报告 failed>0（自报失败，不信 agent）。
        check(
            "testing 自报 failed>0",
            run_command_acceptance("testing", cwd, {
                "unitTest": {"command": "exit 0", "total": 3, "passed": 1, "failed": 2},
            }),
            1,
            "要求 0 失败",
        )

        # 05 测试：命令本身失败。
        check(
            "testing 命令失败",
            run_command_acceptance("testing", cwd, {
                "unitTest": {"command": "exit 3", "total": 3, "passed": 3, "failed": 0},
            }),
            1,
            "退出码非 0（3）",
        )

    print("\n全部断言通过。")


if __name__ == "__main__":
    main()
