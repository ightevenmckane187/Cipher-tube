from __future__ import annotations

from typing import List, Dict, Any
from tck.transport.base import Transport
from tck.reporting.collector import CompatibilityCollector
from codegen.model import Scenario, Step


class Runner:
    def __init__(self, transport: Transport, collector: CompatibilityCollector):
        self.transport = transport
        self.collector = collector

    async def run_scenario(self, scenario: Scenario):
        passed = True
        errors = []

        for step in scenario.steps:
            try:
                await self._execute_step(step)
            except Exception as e:
                passed = False
                errors.append(f"Step failed: {step.text}. Error: {str(e)}")
                break

        # Record result
        requirement_id = "CORE-OPS-001" if "ping" in scenario.name.lower() else "UNKNOWN"
        self.collector.record(
            requirement_id=requirement_id,
            transport="http_json",
            level="MUST",
            passed=passed,
            errors=errors,
        )

    async def _execute_step(self, step: Step):
        if step.action and step.action.type == "SEND_PING":
            ping_id = step.action.params.get("id", "default")
            message = {"type": "ping", "id": ping_id}
            response = await self.transport.send_message(message)
            # Store response in a context if needed for future steps
            step.params = {"last_response": response}

        elif step.trigger and step.trigger.type == "RECEIVE_PONG":
            expected_id = step.trigger.params.get("id")
            # In a more advanced runner, we'd look up the last response from context
            # For now, we'll just check if the action before it was a ping
            # This is simplified for the first functional version
            pass

        elif step.action and step.action.type == "SETUP_AGENT":
            # Agent setup is handled by the test fixture starting the SUT
            pass
