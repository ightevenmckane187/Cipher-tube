import logging
from typing import Dict, Any, List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TelemetryNotifier")

class TelemetryNotifier:
    def __init__(self):
        self.dispatched_events: List[Dict[str, Any]] = []

    def dispatch_alert(self, event_type: str, payload: Dict[str, Any], priority: str = "INFO") -> None:
        """
        Dispatches a telemetry alert regarding sharing operations.
        Logs the alert securely and records it for audit/testing purposes.
        """
        alert_msg = f"[{priority}] Telemetry Event: {event_type} | Payload: {payload}"
        logger.info(alert_msg)

        self.dispatched_events.append({
            "event_type": event_type,
            "payload": payload,
            "priority": priority
        })
