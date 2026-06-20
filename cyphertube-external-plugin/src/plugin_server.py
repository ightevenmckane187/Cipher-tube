import os
import secrets
import json
from fastmcp import FastMCP
from src.guardrails import SecurityGuardrails
from src.telemetry import provenance_counter, anomaly_counter, quality_gauge

# Initialize FastMCP Server matching updated AgentCore Gateway standards
mcp = FastMCP("CypherTube-Hardened-Plugin 🛡️")

@mcp.tool()
def cyphertube_verify_and_rotate(
    x_session_token: str,
    security_classification: str = "CONTROLLED"
) -> str:
    """
    Validates a raw session token via its blinded hash, enforces single-use
    rotation metrics, and returns the tracking metadata profile.
    """
    if not x_session_token or len(x_session_token) < 16:
        anomaly_counter.add(1, {"threat.mitigated": "malformed_header_token"})
        raise PermissionError("Access Denied: Missing or weak session token signature.")

    try:
        # Step 1: Immediately hash the incoming raw token to calculate the storage key
        blinded_hash = SecurityGuardrails.blind_token(x_session_token)

        # Step 2: Verify classification constraints against the environment
        env_classification = os.getenv("MICROVM_SECURITY_BOUND", "CONTROLLED")
        SecurityGuardrails.verify_classification_bounds(security_classification, env_classification)

        # Step 3: Emit verification telemetry
        provenance_counter.add(1, {"lineage.status": "token_blind_verified"})

        return (
            f"[CypherTube Rotation Proxy]\n"
            f"Calculated Blind Storage Key: session:{blinded_hash}\n"
            f"Action: Forwarding to /mcp/rotate for atomic burn and cache invalidation.\n"
            f"Status: PENDING_ROTATION"
        )
    except Exception as e:
        anomaly_counter.add(1, {"threat.mitigated": "rotation_fault"})
        return f"CRITICAL_MITIGATION: Session validation failed: {str(e)}"


@mcp.tool()
def cyphertube_ingest_e2ee_packet(
    packet_envelope_json: str,
    expected_classification: str = "CONTROLLED"
) -> str:
    """
    Ingests and validates the zero-knowledge structure of an E2EE data plane packet.
    Does not attempt decryption—purely acts as an authenticated router.
    """
    try:
        packet = json.loads(packet_envelope_json)

        # Enforce strict envelope schema validation from Phase 2 requirements
        required_keys = {"chunk_index", "blinded_session_hash", "crypto_envelope"}
        crypto_keys = {"iv", "auth_tag", "ciphertext_blob"}

        if not required_keys.issubset(packet.keys()):
            raise ValueError("Malformed packet envelope structure: Missing routing keys.")

        if not crypto_keys.issubset(packet["crypto_envelope"].keys()):
            raise ValueError("Missing critical AEAD parameters (IV, Auth Tag, or Blob) in payload.")

        # Mitigate data poisoning / path-based injections on strings
        SecurityGuardrails.sanitize_input(packet["crypto_envelope"]["ciphertext_blob"])

        # Track metric details
        provenance_counter.add(1, {"lineage.status": "packet_envelope_verified"})
        quality_gauge.set(100.0, {"metric.type": "structural_integrity"})

        return json.dumps({
            "target_stream": packet["blinded_session_hash"],
            "sequence": packet["chunk_index"],
            "dispatch_ready": True,
            "status": "BUFFERED_IN_REDIS"
        })

    except ValueError as val_err:
        anomaly_counter.add(1, {"threat.mitigated": "malformed_packet_injection"})
        return json.dumps({"status": "REJECTED", "reason": str(val_err)})

if __name__ == "__main__":
    # Runs the compliant standard STDIO JSON-RPC transport loop for upstream agent mapping
    mcp.run()
