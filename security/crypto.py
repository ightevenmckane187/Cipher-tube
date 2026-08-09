import hmac
import hashlib
import os
from typing import Dict, Any, Tuple, Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class PayloadEncryptor:
    """
    Automated Security & Payload Encryption Engine
    Enforces cryptographic payload signing and payload encryption (AES-256-GCM)
    across inter-node communications.
    """
    def __init__(self, raw_secret_key: bytes):
        """
        Initializes the payload encryptor with a raw 256-bit secret key (32 bytes).
        """
        if len(raw_secret_key) != 32:
            # If the key is not exactly 32 bytes, derive a 32-byte key using SHA-256
            self.secret_key = hashlib.sha256(raw_secret_key).digest()
        else:
            self.secret_key = raw_secret_key

        self.aesgcm = AESGCM(self.secret_key)

    def encrypt_payload(self, plaintext: str) -> Tuple[bytes, bytes]:
        """
        Encrypts plaintext string using AES-256-GCM.
        Returns Tuple of (nonce_bytes, ciphertext_bytes_with_tag).
        """
        # Generate a standard 12-byte initialization vector (nonce)
        nonce = os.urandom(12)
        ciphertext = self.aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        return nonce, ciphertext

    def decrypt_payload(self, nonce: bytes, ciphertext: bytes) -> str:
        """
        Decrypts ciphertext bytes (including tag) using AES-256-GCM.
        Returns decoded plaintext string.
        """
        decrypted = self.aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted.decode("utf-8")

    def sign_payload(self, payload_bytes: bytes) -> bytes:
        """
        Signs arbitrary payload bytes using HMAC-SHA256 and the internal secret key.
        Returns the computed signature bytes.
        """
        h = hmac.new(self.secret_key, payload_bytes, hashlib.sha256)
        return h.digest()

    def verify_signature(self, payload_bytes: bytes, signature_bytes: bytes) -> bool:
        """
        Verifies computed signature against a reference signature in constant-time.
        Prevents timing analysis side-channel attacks.
        """
        if not isinstance(payload_bytes, (bytes, bytearray)) or not isinstance(signature_bytes, (bytes, bytearray)):
            return False
        expected_sig = self.sign_payload(payload_bytes)
        return hmac.compare_digest(expected_sig, signature_bytes)

    def secure_wrap(self, plaintext: str) -> Dict[str, str]:
        """
        Convenience method to encrypt, sign, and encode a payload for network transit.
        Returns a dictionary containing hex-encoded values.
        """
        nonce, ciphertext = self.encrypt_payload(plaintext)
        signature = self.sign_payload(ciphertext)
        return {
            "nonce_hex": nonce.hex(),
            "ciphertext_hex": ciphertext.hex(),
            "signature_hex": signature.hex()
        }

    def secure_unwrap(self, envelope: Dict[str, str]) -> str:
        """
        Convenience method to verify, decrypt, and decode a secure payload envelope.
        Raises ValueError if integrity/signature checks or decryption fails.
        """
        try:
            if not isinstance(envelope, dict):
                raise TypeError("Envelope must be a dictionary")
            nonce = bytes.fromhex(envelope["nonce_hex"])
            ciphertext = bytes.fromhex(envelope["ciphertext_hex"])
            signature = bytes.fromhex(envelope["signature_hex"])
        except (KeyError, ValueError, TypeError) as err:
            raise ValueError(f"Invalid secure envelope format: {err}")

        # 1. Enforce payload signature verification (HMAC constant-time match)
        if not self.verify_signature(ciphertext, signature):
            raise ValueError("Integrity verification failed: Payload signature mismatch.")

        # 2. Decrypt payload
        try:
            return self.decrypt_payload(nonce, ciphertext)
        except Exception as err:
            raise ValueError(f"Payload decryption failed: {err}")
