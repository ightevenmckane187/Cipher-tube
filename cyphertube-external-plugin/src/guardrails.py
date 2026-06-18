import re
import hashlib
from typing import Dict, Any

class SecurityGuardrails:
    ADVERSARIAL_PATTERNS = [
        re.compile(r"(?i)\b(ignore previous instructions|system prompt|overwrite role|execute script)\b"),
        re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F]")
    ]

    @classmethod
    def blind_token(cls, token: str) -> str:
        """
        Mirrors core TypeScript session_rotator.ts blinding logic.
        Calculates the SHA-256 hex digest of the raw client token.
        """
        return hashlib.sha256(token.encode('utf-8')).hexdigest()

    @classmethod
    def sanitize_input(cls, input_str: str) -> str:
        cleaned = input_str.strip()
        for pattern in cls.ADVERSARIAL_PATTERNS:
            if pattern.search(cleaned):
                raise ValueError("Security Policy Violation: Adversarial pattern detected in input pipeline payload.")
        return cleaned

    @classmethod
    def verify_classification_bounds(cls, data_classification: str, boundary_classification: str):
        if data_classification.upper() != boundary_classification.upper():
            raise PermissionError(
                f"Data Isolation Failure: Attempting to commingle {data_classification} data "
                f"inside a {boundary_classification} microVM context."
            )
