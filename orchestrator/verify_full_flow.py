"""端到端验证 5 阶段流水线：需求 → 设计 → 任务 → 编码 → 测试。

自动处理 interrupt：question 选第一项、approval 允许一次、gate（validation=passed）自动 approve。
观察：每阶段 validation 状态（schema 校验 + 04/05 命令验收）与阶段推进。
"""

from __future__ import annotations

import sys
import time

import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = "http://127.0.0.1:3087"
CWD = r"D:\ccn-work\src\github\deepseek-harness-delivery\examples\002"
REQ = (
    "实现一个追溯码工具库（Node.js，纯函数，无外部依赖）："
    "(1) 生成追溯码，格式为企业前缀-商品代码-序列号-校验位；"
    "(2) 解析追溯码，拆出各字段并校验格式。"
    "代码放 services/ 下，必须自带可真实运行的 npm test（断言生成与解析互逆）。"
)

r = requests.post(f"{BASE}/flow/start", json={"requirement_text": REQ, "cwd": CWD}, timeout=60)
tid = r.json()["thread_id"]
print(f"thread={tid}", flush=True)

finished: dict[str, str] = {}  # stage name → validation status
last_stage = None
last_pending = None

for i in range(480):  # 上限约 480×10s = 80 分钟
    try:
        snap = requests.get(f"{BASE}/flow/state/{tid}", timeout=30).json()
    except Exception as e:  # noqa: BLE001
        print(f"[{i}] state 读失败: {e}", flush=True)
        time.sleep(10)
        continue

    stage = snap["stage"]
    v = snap.get("validation", {})
    p = snap.get("pending")
    if stage != last_stage:
        print(f"[{i}] === 阶段 {stage} ===（validation={v.get('status')}）", flush=True)
        last_stage = stage

    if snap.get("error"):
        print(f"[{i}] ❌ 图运行错误: {snap['error']}", flush=True)

    # gate 意味着该阶段确定性校验已出结果（passed / failed）。
    ptype = (p or {}).get("type")
    if ptype == "gate":
        gstage = p.get("stage")
        if gstage not in finished:
            finished[gstage] = v.get("status")
            print(f"[{i}]   → {gstage} validation={v.get('status')} attempts={v.get('attempts')}", flush=True)
            if v.get("error"):
                print(f"      错误详情：{v.get('error')}", flush=True)
        if v.get("status") == "failed":
            print(f"[{i}] ❌ {gstage} 校验失败（重试后仍失败，升级人工），停止自动推进。", flush=True)
            break
        requests.post(f"{BASE}/flow/resume/{tid}", json={"answer": "approve"}, timeout=60)
        print(f"[{i}]   已 approve gate「{gstage}」", flush=True)
        time.sleep(10)
        continue

    if snap.get("done"):
        print(f"[{i}] ✅ 流水线完成：5 阶段全部通过。", flush=True)
        break

    if ptype == "question":
        answers = []
        for q in p.get("questions", []):
            opts = q.get("options") or []
            answers.append({"id": q["id"], "selected": [opts[0]["label"]] if opts else []})
        requests.post(f"{BASE}/flow/resume/{tid}", json={"answer": answers}, timeout=60)
        print(f"[{i}]   已回答 {len(answers)} 个问题", flush=True)
    elif ptype == "approval":
        requests.post(f"{BASE}/flow/resume/{tid}", json={"answer": "allowed-once"}, timeout=60)
        print(f"[{i}]   已批准一次危险命令（{p.get('toolName')}）", flush=True)

    if (p or {}).get("type") != last_pending:
        last_pending = (p or {}).get("type")
    time.sleep(10)

snap = requests.get(f"{BASE}/flow/state/{tid}", timeout=30).json()
print("\n== 汇总 ==", flush=True)
print("done:", snap.get("done"), "stage:", snap.get("stage"), flush=True)
for st, status in finished.items():
    print(f"  {st}: {status}", flush=True)
print("artifacts:", list(snap.get("artifacts", {}).keys()), flush=True)
print("最终 validation:", snap.get("validation"), flush=True)
