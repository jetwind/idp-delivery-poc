"""harness 执行层（3086 dsh web 实例）的 HTTP/WebSocket 客户端。

wire 契约（与前端 transport 层一致，见 PROJECT.md）：
- legacy API：POST /api/session.{method}，payload 直接放业务参数。
- Remote 端点：POST /api/specStore/{method}，payload 必须 {args:{request}}，双层 ok。
- question：WebSocket /api/events.host 收 server-request 帧（method=question/requested），
  回答走 POST /api/respond（client-response，echo rpcId）。
"""

from __future__ import annotations

import itertools
from typing import Any

import httpx


class HarnessError(RuntimeError):
    """harness 调用失败（carrier 或业务层）。"""


class HarnessClient:
    def __init__(self, base_url: str = "http://127.0.0.1:3086") -> None:
        self.base_url = base_url.rstrip("/")
        self._seq = itertools.count(1)

    def _rpc_id(self) -> str:
        return f"orchestrator-{next(self._seq)}"

    async def _post(self, path: str, body: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=600.0) as client:
            resp = await client.post(f"{self.base_url}{path}", json=body)
        if resp.status_code != 200:
            raise HarnessError(f"{path} carrier failed: HTTP {resp.status_code}")
        envelope = resp.json()
        result = envelope.get("result")
        if not result or not result.get("ok"):
            raise HarnessError(f"{path} failed: {result.get('error') if result else envelope}")
        return result["value"]

    async def _legacy(self, method: str, payload: dict[str, Any]) -> dict[str, Any]:
        body = {
            "type": "client-request",
            "rpcId": self._rpc_id(),
            "method": method,
            "payload": payload,
        }
        return await self._post(f"/api/{method}", body)

    # ---- session（legacy）----

    async def create_session(self, cwd: str, agent_preset: str, workspace_title: str | None = None) -> dict[str, Any]:
        """开新会话。workspace_title 非空时，先把 cwd 对应的 harness 工作区命名成项目名，
        再以 workspaceId 建会话，使 3086 界面里的会话按项目分组（而非「未分组」）。"""
        if workspace_title:
            wid = await self._ensure_workspace(cwd, workspace_title)
            if wid:
                return await self._legacy("session.create", {"workspaceId": wid, "agentPreset": agent_preset})
        return await self._legacy("session.create", {"cwd": cwd, "agentPreset": agent_preset})

    async def _ensure_workspace(self, cwd: str, title: str) -> str:
        """创建/复用 cwd 对应的工作区，并把显示标题设为项目名；返回 workspaceId。"""
        created = await self._legacy("workspace.create", {"path": cwd})
        workspace = created.get("workspace", {}) or {}
        wid = workspace.get("workspaceId")
        if wid and workspace.get("title") != title:
            try:
                await self._legacy("workspace.rename", {"workspaceId": wid, "title": title})
            except HarnessError:  # noqa: BLE001 - 标题重名等失败不阻断建会话
                pass
        return wid or ""

    async def select_model(
        self, session_id: str, provider: str, model: str, reasoning_effort: str | None = None,
    ) -> dict[str, Any]:
        """给 session 选模型 + 思考深度（reasoningEffort: off/high/max）。"""
        payload: dict[str, Any] = {"sessionId": session_id, "provider": provider, "model": model}
        if reasoning_effort:
            payload["reasoningEffort"] = reasoning_effort
        return await self._legacy("session.selectModel", payload)

    async def session_models(self, session_id: str) -> dict[str, Any]:
        return await self._legacy("session.models", {"sessionId": session_id})

    async def execute_command(self, session_id: str, line: str) -> dict[str, Any]:
        """执行 slash command（如 /permission <preset>），走 Typert Remote 端点 commands/execute。"""
        body = {
            "type": "client-request",
            "rpcId": self._rpc_id(),
            "method": "commands/execute",
            "payload": {"args": {"agentId": session_id, "line": line}},
        }
        return await self._post("/api/commands/execute", body)

    async def prompt(self, session_id: str, text: str) -> dict[str, Any]:
        return await self._legacy(
            "session.prompt",
            {"sessionId": session_id, "mode": "queue", "content": [{"type": "text", "text": text}]},
        )

    async def session_running(self, session_id: str) -> bool:
        value = await self._legacy("session.list", {})
        for item in value.get("items", []):
            if item.get("sessionId") == session_id:
                return bool(item.get("running"))
        return False

    async def session_projection(self, session_id: str) -> dict[str, Any] | None:
        """从 session.list 取某会话的投影：running / todos（todo_write 子步骤）/ title。"""
        value = await self._legacy("session.list", {})
        for item in value.get("items", []):
            if item.get("sessionId") == session_id:
                proj = (item.get("projections") or {}).get("values", {}) or {}
                return {
                    "running": bool(item.get("running")),
                    "todos": proj.get("todos") or [],
                    "title": proj.get("title") or "",
                }
        return None

    async def session_history(
        self, session_id: str, before_seq: int | None = None, max_messages: int = 10,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"sessionId": session_id, "maxMessages": max_messages}
        if before_seq is not None:
            payload["beforeSeq"] = before_seq
        return await self._legacy("session.history", payload)

    async def list_sessions(self) -> list[dict[str, Any]]:
        value = await self._legacy("session.list", {})
        return value.get("items", [])

    # ---- question / approval（WebSocket + /api/respond）----

    async def respond_question(
        self, question_rpc_id: str, session_id: str, answers: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """回答一个 ask_user_question 批次。answers 每项 {id, selected, custom?}。"""
        body = {
            "type": "client-response",
            "rpcId": question_rpc_id,
            "result": {
                "ok": True,
                "value": {
                    "sessionId": session_id,
                    "answer": {"answers": answers},
                },
            },
        }
        async with httpx.AsyncClient(timeout=600.0) as client:
            resp = await client.post(f"{self.base_url}/api/respond", json=body)
        return resp.json()

    async def respond_approval(
        self, approval_rpc_id: str, session_id: str, approval_id: str, outcome: str,
    ) -> dict[str, Any]:
        """回答一个 approval（危险操作权限审批）。outcome: allowed-once / rejected。"""
        body = {
            "type": "client-response",
            "rpcId": approval_rpc_id,
            "result": {
                "ok": True,
                "value": {
                    "sessionId": session_id,
                    "approvalId": approval_id,
                    "outcome": outcome,
                },
            },
        }
        async with httpx.AsyncClient(timeout=600.0) as client:
            resp = await client.post(f"{self.base_url}/api/respond", json=body)
        return resp.json()


def extract_assistant_text(history: dict[str, Any]) -> str:
    """从 session.history 结果中提取最新 assistant 文本（作为阶段产物快照）。"""
    parts: list[str] = []
    for entry in history.get("events", []):
        event = entry.get("event", {})
        if event.get("type") != "assistant/message":
            continue
        data = event.get("data", {})
        message = data.get("message", {})
        content = message.get("content") if isinstance(message, dict) else data.get("content")
        if not isinstance(content, list):
            continue
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text" and block.get("text"):
                parts.append(block["text"])
    return "\n".join(parts)
