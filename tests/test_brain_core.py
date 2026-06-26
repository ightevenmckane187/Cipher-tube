import pytest
from app.brain_core import build_cipher_tube, blind_token, BrainCore
import os

def test_build_cipher_tube():
    plaintext = b"hello world"
    master_seed = os.urandom(32)
    result = build_cipher_tube(plaintext, master_seed)

    assert result.ciphertext is not None
    assert len(result.tubes) == 25  # 12 integrity + 13 encryption
    assert result.audit["seedHash"] is not None

def test_blind_token():
    token = "test-token"
    hashed = blind_token(token)
    assert len(hashed) == 64  # SHA-256 hex
    assert hashed != token

def test_brain_core_halt():
    brain = BrainCore()
    assert brain.is_halted == False
    brain.halt()
    assert brain.is_halted == True

    with pytest.raises(Exception, match="System is currently halted"):
        brain.validate_action("any")
