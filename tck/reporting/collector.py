from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class TestResult:
    requirement_id: str
    transport: str
    level: str
    passed: bool
    errors: List[str] = field(default_factory=list)


class CompatibilityCollector:
    def __init__(self):
        self.results: List[TestResult] = []

    def record(
        self,
        requirement_id: str,
        transport: str,
        level: str,
        passed: bool,
        errors: Optional[List[str]] = None,
    ):
        self.results.append(
            TestResult(
                requirement_id=requirement_id,
                transport=transport,
                level=level,
                passed=passed,
                errors=errors or [],
            )
        )

    def get_report(self) -> List[TestResult]:
        return self.results
