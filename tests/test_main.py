from fastapi.testclient import TestClient
from app.main import app
import pytest

# Use raise_server_exceptions=False to test 500 responses instead of raising them in the test
client = TestClient(app, raise_server_exceptions=False)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "system": "Cypher-Tube OS", "version": "1.0"}

def test_create_session():
    response = client.post("/mcp", headers={"x-user-id": "test-user"})
    assert response.status_code == 201
    data = response.json()
    assert "sessionId" in data
    assert "sessionToken" in data

def test_halt_resume():
    # Initial status
    response = client.get("/mcp/status")
    assert response.json()["is_halted"] == False

    # Halt
    response = client.post("/mcp/halt")
    assert response.status_code == 200

    response = client.get("/mcp/status")
    assert response.json()["is_halted"] == True

    # Try action while halted
    response = client.post("/mcp", headers={"x-user-id": "test-user"})
    assert response.status_code == 500

    # Resume
    response = client.post("/mcp/resume")
    assert response.status_code == 200

    response = client.get("/mcp/status")
    assert response.json()["is_halted"] == False

    # Try action again after resume
    response = client.post("/mcp", headers={"x-user-id": "test-user"})
    assert response.status_code == 201
