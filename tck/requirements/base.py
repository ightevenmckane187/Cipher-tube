from __future__ import annotations

from enum import Enum
from typing import NamedTuple


class RequirementLevel(Enum):
    MUST = "MUST"
    SHOULD = "SHOULD"
    MAY = "MAY"


class Requirement(NamedTuple):
    id: str
    description: str
    level: RequirementLevel


# CORE-OPS Requirements
CORE_OPS_PING = Requirement(
    id="CORE-OPS-001",
    description="The agent MUST respond to a ping message to demonstrate availability.",
    level=RequirementLevel.MUST,
)

CORE_OPS_DISCOVER = Requirement(
    id="CORE-OPS-002",
    description="The agent SHOULD support discovery of its capabilities via an agent card.",
    level=RequirementLevel.SHOULD,
)

ALL_REQUIREMENTS = [
    CORE_OPS_PING,
    CORE_OPS_DISCOVER,
]


class ErrorCode(Enum):
    INVALID_REQUEST = "INVALID_REQUEST"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    UNSUPPORTED_TRANSPORT = "UNSUPPORTED_TRANSPORT"
    MALFORMED_MESSAGE = "MALFORMED_MESSAGE"
