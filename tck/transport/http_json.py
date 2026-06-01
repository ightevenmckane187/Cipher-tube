from __future__ import annotations

import httpx
from typing import Any, Optional
from tck.transport.base import Transport


class HttpJsonTransport(Transport):
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(base_url=self.base_url, timeout=10.0)
        return self._client

    async def send_message(self, message: dict[str, Any]) -> dict[str, Any]:
        response = await self.client.post("/message", json=message)
        response.raise_for_status()
        return response.json()

    async def get_agent_card(self) -> dict[str, Any]:
        response = await self.client.get("/agent-card")
        response.raise_for_status()
        return response.json()

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None
