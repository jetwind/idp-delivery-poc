"""端到端验证：LangGraph 流水线真实驱动 harness 跑需求阶段。

自动处理 interrupt：question 选第一个选项，gate 自动 approve。
观察：阶段推进、产物写入 specStore、question 转达、gate 暂停。
"""

from __future__ import annotations

import asyncio
import sys
from typing import Any

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from langgraph.types import Command

from graph import STAGES, build_graph
from harness_client import HarnessClient


async def pending_interrupt(graph, config) -> Any | None:
    snap = await graph.aget_state(config)
    for task in snap.tasks or []:
        interrupts = getattr(task, "interrupts", None) or []
        if interrupts:
            return interrupts[0].value
    return None


async def main() -> None:
    client = HarnessClient()
    graph = build_graph(client)
    thread_id = "verify-flow-1"
    config = {"configurable": {"thread_id": thread_id}}

    initial: dict[str, Any] = {
        "requirement_text": "帮我做一个一物一码的产品追溯系统，需要支持扫码溯源和防窜货。",
        "cwd": "D:/ccn-work/src/github/deepseek-harness-delivery/examples/project-delivery",
        "stage_index": 0,
        "spec_cache": {},
    }

    print("== 启动流水线 ==")
    await graph.ainvoke(initial, config=config)

    for round_i in range(6):
        snap = await graph.aget_state(config)
        values = snap.values or {}
        stage_index = values.get("stage_index", 0)
        stage = STAGES[stage_index]["name"] if stage_index < len(STAGES) else "完成"
        print(f"\n== 第 {round_i} 轮 interrupt 检查：当前阶段={stage} spec_cache={list(values.get('spec_cache', {}).keys())} ==")

        pending = await pending_interrupt(graph, config)
        if pending is None:
            print("无 interrupt，图结束")
            break

        if pending["type"] == "gate":
            print(f"  [gate] 阶段「{pending['stage']}」等待确认 → 自动 approve")
            await graph.ainvoke(Command(resume="approve"), config=config)
        elif pending["type"] == "question":
            questions = pending["questions"]
            answers = []
            for q in questions:
                opts = q.get("options") or []
                selected = [opts[0]["label"]] if opts else []
                print(f"  [question] {q['id']}: {q['question']} → 自动选 {selected}")
                answers.append({"id": q["id"], "selected": selected})
            await graph.ainvoke(Command(resume=answers), config=config)
        else:
            print(f"  未知 interrupt 类型: {pending}")
            break

    print("\n== 最终状态 ==")
    snap = await graph.aget_state(config)
    print(f"  stage_index={snap.values.get('stage_index')}")
    print(f"  spec_cache keys={list(snap.values.get('spec_cache', {}).keys())}")


if __name__ == "__main__":
    asyncio.run(main())
