import os
import uuid
import time
import hashlib
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from cryptography.hazmat.primitives import hashes, hmac
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Constants matching Node.js implementation
NUM_INTEGRITY_TUBES = 12
NUM_ENCRYPTION_LAYERS = 13
SESSION_TTL = 3600

class Tube(BaseModel):
    layer: int
    type: str
    salt: str
    hash: Optional[str] = None
    iv: Optional[str] = None
    tag: Optional[str] = None

class CipherTubeResult(BaseModel):
    ciphertext: str
    tubes: List[Tube]
    hashChain: Optional[List[str]] = None
    audit: Dict[str, Any]

def fast_hash(algorithm: str, data: bytes) -> bytes:
    h = hashlib.new(algorithm)
    h.update(data)
    return h.digest()

def derive_key(master: bytes, salt: bytes, info: bytes) -> bytes:
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        info=info,
    )
    return hkdf.derive(master)

def build_cipher_tube(plaintext: bytes, master_seed: bytes) -> CipherTubeResult:
    current = plaintext
    tubes = []
    audit_logs = []
    hash_chain = []

    # Entropy generation
    entropy_needed = (NUM_INTEGRITY_TUBES * 16) + (NUM_ENCRYPTION_LAYERS * 16) + (NUM_ENCRYPTION_LAYERS * 12)
    entropy_pool = os.urandom(entropy_needed)
    offset = 0

    # 12 Hash-Lock Tubes (Integrity)
    integrity_hash = hashlib.sha512(current).hexdigest()

    for i in range(NUM_INTEGRITY_TUBES):
        salt = entropy_pool[offset:offset+16].hex()
        offset += 16

        hash_chain.append(integrity_hash)
        tubes.append(Tube(
            layer=i,
            type="hash-lock",
            salt=salt,
            hash=integrity_hash
        ))
        audit_logs.append(f"Tube {i}: SHA-512 hash lock computed for integrity")

    # 13 AES-256-GCM Encryption Layers
    for j in range(NUM_ENCRYPTION_LAYERS):
        layer_id = NUM_INTEGRITY_TUBES + j
        salt_bytes = entropy_pool[offset:offset+16]
        salt_hex = salt_bytes.hex()
        offset += 16

        iv_bytes = entropy_pool[offset:offset+12]
        iv_hex = iv_bytes.hex()
        offset += 12

        info = f"enc-{j}".encode()
        key = derive_key(master_seed, salt_bytes, info)

        aesgcm = AESGCM(key)
        # current is plaintext, iv is nonce, additional_data is None
        ciphertext = aesgcm.encrypt(iv_bytes, current, None)

        # In cryptography.py AESGCM, tag is appended to ciphertext
        tag = ciphertext[-16:]
        actual_ciphertext = ciphertext[:-16]

        # Current becomes [iv, tag, ciphertext] to match Node.js Buffer.concat([iv, tag, update, final])
        current = iv_bytes + tag + actual_ciphertext

        tubes.append(Tube(
            layer=layer_id,
            type="aes-256-gcm",
            salt=salt_hex,
            iv=iv_hex,
            tag=tag.hex()
        ))
        audit_logs.append(f"Layer {layer_id}: AES-256-GCM encryption applied")

    return CipherTubeResult(
        ciphertext=current.hex(),
        tubes=tubes,
        hashChain=hash_chain,
        audit={
            "whatHappened": audit_logs,
            "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            "seedHash": hashlib.sha256(master_seed).hexdigest()
        }
    )

def blind_token(token: str) -> str:
    if not token:
        return ""
    return hashlib.sha256(token.encode()).hexdigest()

class BrainCore:
    def __init__(self):
        # Circuit breaker state
        self.is_halted = False

    def halt(self):
        self.is_halted = True

    def resume(self):
        self.is_halted = False

    def validate_action(self, action: str):
        if self.is_halted:
            raise Exception("System is currently halted by Emergency Stop.")
        return True
