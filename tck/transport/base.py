from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class Transport(ABC):
    @abstractmethod
    async def send_message(self, message: dict[str, Any]) -> dict[str, Any]:
        """Sends a message to the SUT and returns the response."""
        pass

    @abstractmethod
    async def get_agent_card(self) -> dict[str, Any]:
        """Retrieves the agent card from the SUT."""
        pass
