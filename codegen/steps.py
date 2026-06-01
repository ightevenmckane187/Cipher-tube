from __future__ import annotations

import re
from typing import Optional, Tuple, Dict, Any
from codegen.model import Trigger, Action


class StepResolver:
    def __init__(self):
        # Maps regex patterns to (type, category) where category is 'trigger' or 'action'
        self.patterns = [
            (r'I send a ping message with ID "(.*)"', 'SEND_PING', 'action', ['id']),
            (r'the agent should respond with a pong message with ID "(.*)"', 'RECEIVE_PONG', 'trigger', ['id']),
            (r'the agent is running', 'SETUP_AGENT', 'action', []),
        ]

    def resolve(self, step_text: str) -> Tuple[Optional[Trigger], Optional[Action]]:
        for pattern, type_name, category, param_names in self.patterns:
            match = re.search(pattern, step_text)
            if match:
                params = {}
                for i, name in enumerate(param_names):
                    params[name] = match.group(i + 1)

                if category == 'trigger':
                    return Trigger(type=type_name, params=params), None
                else:
                    return None, Action(type=type_name, params=params)

        return None, None
