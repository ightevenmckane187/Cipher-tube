from fastapi import FastAPI, Header, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import uvicorn
import uuid

from .brain_core import BrainCore, build_cipher_tube, blind_token

app = FastAPI(title="Cypher-Tube OS v1.0 Kernel")
brain = BrainCore()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock session store
sessions: Dict[str, str] = {}

class SessionResponse(BaseModel):
    sessionId: str
    sessionToken: str

class MessageRequest(BaseModel):
    message: str
    masterSeed: str

@app.get("/health")
async def health():
    return {"status": "ok", "system": "Cypher-Tube OS", "version": "1.0"}

@app.post("/mcp", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(x_user_id: str = Header(...)):
    brain.validate_action("create_session")
    session_token = str(uuid.uuid4())
    sessions[session_token] = x_user_id
    return SessionResponse(sessionId=session_token, sessionToken=session_token)

@app.post("/mcp/halt")
async def emergency_halt():
    brain.halt()
    return {"message": "System halted immediately."}

@app.post("/mcp/resume")
async def resume_operations():
    brain.resume()
    return {"message": "System operations resumed."}

@app.get("/mcp/status")
async def get_status():
    return {"is_halted": brain.is_halted}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
