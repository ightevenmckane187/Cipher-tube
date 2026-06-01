from __future__ import annotations

from fastapi import FastAPI, Body
from pydantic import BaseModel
from typing import Any, Dict

app = FastAPI()

class Message(BaseModel):
    type: str
    id: str
    payload: Dict[str, Any] = {}

@app.get("/agent-card")
async def get_agent_card():
    return {
        "id": "generated-sut",
        "capabilities": ["ping"],
        "transports": ["http_json"]
    }

@app.post("/message")
async def handle_message(message: Message):
    if message.type == "ping":
        return {
            "type": "pong",
            "id": message.id,
            "payload": {"status": "ok"}
        }
    return {"type": "error", "message": "unsupported message type"}

if __name__ == "__main__":
    import uvicorn
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    uvicorn.run(app, host="0.0.0.0", port=port)