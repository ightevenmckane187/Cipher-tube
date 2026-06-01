from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional


@dataclass
class Action:
    type: str
    params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Trigger:
    type: str
    params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Step:
    text: str
    trigger: Optional[Trigger] = None
    action: Optional[Action] = None


@dataclass
class Scenario:
    name: str
    description: str
    steps: List[Step] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
