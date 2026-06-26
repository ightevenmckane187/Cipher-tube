import re

class SecurityGuardrails:
    # Strict regex matching potential prompt/command injection attempts
    ADVERSARIAL_PATTERNS = [
        re.compile(r"(?i)\b(ignore previous instructions|system prompt|overwrite role|execute script)\b"),
        re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F]") # Strip non-printable control blocks
    ]

    @classmethod
    def sanitize_input(cls, input_str: str) -> str:
        """Validates and cleans arbitrary text strings entering the analytics boundary."""
        cleaned = input_str.strip()
        for pattern in cls.ADVERSARIAL_PATTERNS:
            if pattern.search(cleaned):
                raise ValueError("Security Policy Violation: Adversarial pattern detected in input pipeline payload.")
        return cleaned

    @classmethod
    def verify_classification_bounds(cls, data_classification: str, boundary_classification: str):
        """Strict data anti-commingling rule validation."""
        if data_classification.upper() != boundary_classification.upper():
            raise PermissionError(
                f"Data Isolation Failure: Attempting to commingle {data_classification} data "
                f"inside a {boundary_classification} microVM context."
            )
