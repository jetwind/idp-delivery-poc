"""HTTP 端到端验证：模拟前端走 /flow/* API，真实驱动流水线。"""
from __future__ import annotations

import os
import sys
import time

import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "http://localhost:8080"  # 直连编排服务（带 CORS），/flow/start、/flow/resume 同步阻塞几分钟
# 工作目录：交付文件夹下的 examples/project-delivery（跨平台推导）。
CWD = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "examples", "project-delivery")


def main() -> None:
    r = requests.post(f"{BASE}/flow/start", json={
        "requirement_text": "帮我做一个一物一码的产品追溯系统，需要扫码溯源和防窜货。",
        "cwd": CWD,
    }, timeout=900)
    r.raise_for_status()
    snap = r.json()
    tid = snap["thread_id"]
    print(f"started: thread={tid} stage={snap['stage']}")

    for _ in range(60):
        pending = snap.get("pending")
        if snap.get("done") and pending is None:
            print("DONE 流水线完成")
            break
        if pending is None:
            time.sleep(2)
            snap = requests.get(f"{BASE}/flow/state/{tid}", timeout=30).json()
            continue
        if pending["type"] == "question":
            answers = []
            for q in pending["questions"]:
                opts = q.get("options") or []
                sel = [opts[0]["label"]] if opts else []
                answers.append({"id": q["id"], "selected": sel})
                print(f"  [question] {q['id']}: {q['question'][:40]} → {sel}")
            snap = requests.post(f"{BASE}/flow/resume/{tid}", json={"answer": answers}, timeout=900).json()
        elif pending["type"] == "gate":
            print(f"  [gate] 「{pending['stage']}」→ approve")
            snap = requests.post(f"{BASE}/flow/resume/{tid}", json={"answer": "approve"}, timeout=900).json()
        elif pending["type"] == "approval":
            print(f"  [approval] {pending.get('toolName')} → allowed-once")
            snap = requests.post(f"{BASE}/flow/resume/{tid}", json={"answer": "allowed-once"}, timeout=900).json()
        else:
            print(f"  未知 pending: {pending}")
            break

    print(f"final: stage_index={snap.get('stage_index')} done={snap.get('done')} artifacts={list(snap.get('artifacts', {}).keys())}")


if __name__ == "__main__":
    main()
