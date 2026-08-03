import unittest
import asyncio
import time
import os
from core.nodes import UnifiedNodeManager, NodeType, SensoryNode, ViewableNode, ActionableNode
from core.telemetry import SelfInspectionLoop
from core.indexer import KnowledgeIndexer
from security.crypto import PayloadEncryptor

class TestNodesAndPipeline(unittest.IsolatedAsyncioTestCase):
    """
    Unit tests for core/nodes.py: Unified Node Manager & Node Archetypes.
    """
    async def asyncSetUp(self):
        self.manager = UnifiedNodeManager()
        self.sensory = SensoryNode("sensory-01")
        self.viewable = ViewableNode("viewable-01", metadata={"coordinates": [1, 2, 3]})

        # Action tracker
        self.actions_handled = []
        async def dummy_execution_channel(payload):
            self.actions_handled.append(payload)

        self.actionable = ActionableNode("actionable-01", execution_channel=dummy_execution_channel)

        self.manager.register_node(self.sensory)
        self.manager.register_node(self.viewable)
        self.manager.register_node(self.actionable)

    async def test_node_registration(self):
        self.assertEqual(len(self.manager.nodes), 3)
        self.assertIs(self.manager.nodes["sensory-01"], self.sensory)
        self.assertIs(self.manager.nodes["viewable-01"], self.viewable)
        self.assertIs(self.manager.nodes["actionable-01"], self.actionable)

        # Test filter by type
        sensory_nodes = self.manager.get_nodes_by_type(NodeType.SENSORY)
        self.assertEqual(len(sensory_nodes), 1)
        self.assertIn(self.sensory, sensory_nodes)

    async def test_pipeline_execution(self):
        payload = {"raw_data": "  high-frequency-telemetry  ", "action_type": "remediate"}
        result = await self.manager.pipeline_execute("sensory-01", "viewable-01", "actionable-01", payload)

        self.assertEqual(result["pipeline_status"], "success")
        self.assertEqual(result["sensory"]["sanitized_data"], "high-frequency-telemetry")
        self.assertEqual(result["viewable"]["display_text"], "OS Node display: high-frequency-telemetry")
        self.assertEqual(result["actionable"]["execution_status"], "executed")
        self.assertEqual(len(self.actions_handled), 1)

    async def test_asynchronous_background_execution_channels(self):
        # Start queue worker
        await self.manager.start_queue_worker()

        task_run_count = 0
        async def background_heal():
            nonlocal task_run_count
            await asyncio.sleep(0.1)
            task_run_count += 1

        # Enqueue task
        await self.manager.enqueue_task(background_heal())
        await asyncio.sleep(0.2)  # Allow worker loop to run

        self.assertEqual(task_run_count, 1)

        # Schedule direct background task (referenced set mechanism)
        task_run_count_2 = 0
        async def background_monitor():
            nonlocal task_run_count_2
            await asyncio.sleep(0.05)
            task_run_count_2 += 1

        self.manager.schedule_background_task(background_monitor())
        await asyncio.sleep(0.1)

        self.assertEqual(task_run_count_2, 1)

        # Stop worker
        await self.manager.stop_queue_worker()


class TestTelemetryAndSelfInspection(unittest.IsolatedAsyncioTestCase):
    """
    Unit tests for core/telemetry.py: Continuous Self-Inspection & Graceful Fallback Recovery.
    """
    async def asyncSetUp(self):
        self.manager = UnifiedNodeManager()
        self.sensory = SensoryNode("sensory-01")
        self.viewable = ViewableNode("viewable-01")
        self.manager.register_node(self.sensory)
        self.manager.register_node(self.viewable)
        self.telemetry_loop = SelfInspectionLoop(self.manager, check_interval_secs=0.01)

    async def test_latency_metrics_logging_and_averages(self):
        self.telemetry_loop.record_latency("endpoint-01", 12.5)
        self.telemetry_loop.record_latency("endpoint-01", 17.5)
        self.telemetry_loop.record_latency("endpoint-01", 15.0)

        avg = self.telemetry_loop.get_average_latency("endpoint-01")
        self.assertAlmostEqual(avg, 15.0)

        # Test empty metric case
        self.assertEqual(self.telemetry_loop.get_average_latency("non-existent"), 0.0)

    async def test_anomaly_logging(self):
        self.assertEqual(len(self.telemetry_loop.anomalies_log), 0)
        self.telemetry_loop.log_anomaly("sensory-01", "HIGH", "Packet structure anomaly detected.")
        self.assertEqual(len(self.telemetry_loop.anomalies_log), 1)
        self.assertEqual(self.telemetry_loop.anomalies_log[0]["node_id"], "sensory-01")
        self.assertEqual(self.telemetry_loop.anomalies_log[0]["severity"], "HIGH")

    async def test_automated_fallback_and_node_recovery(self):
        # Degrade sensory node status to 'failed'
        self.sensory.status = "failed"
        self.assertEqual(self.sensory.status, "failed")

        # Run inspection cycle
        results = await self.telemetry_loop.inspect_system()

        # Check recovery results
        self.assertEqual(results["failed_nodes"], 1)
        self.assertEqual(len(results["recovered"]), 1)
        self.assertEqual(results["recovered"][0]["node_id"], "sensory-01")
        self.assertEqual(results["recovered"][0]["previous_status"], "failed")

        # Verify status is recovered back to healthy
        self.assertEqual(self.sensory.status, "healthy")
        self.assertTrue(self.sensory.metadata.get("fallback_applied"))


class TestKnowledgeIndexingAndStateRecovery(unittest.TestCase):
    """
    Unit tests for core/indexer.py: Knowledge Indexer & Point-in-time state recovery.
    """
    def setUp(self):
        self.indexer = KnowledgeIndexer()

    def test_keyword_indexing_and_search(self):
        self.indexer.index_document("doc-1", "Sovereign CypherTube operational logs and active nodes.")
        self.indexer.index_document("doc-2", "Self-healing pipeline telemetry diagnostic anomalies.")
        self.indexer.index_document("doc-3", "Cryptographic payload encryption and secure inter-node communications.")

        # Search query containing highly specific terms
        results = self.indexer.search_keyword("payload encryption")
        self.assertTrue(len(results) > 0)
        # Doc-3 should be the highest-scoring matching document
        self.assertEqual(results[0][0], "doc-3")

        # Search for non-matching query
        no_results = self.indexer.search_keyword("unrelated-random-word")
        self.assertEqual(len(no_results), 0)

    def test_vector_indexing_and_cosine_similarity(self):
        # 4-dimensional dense vectors
        v1 = [1.0, 0.0, 0.0, 0.0]
        v2 = [0.0, 1.0, 0.0, 0.0]
        v3 = [0.8, 0.6, 0.0, 0.0]  # Closest to v1 and query

        self.indexer.index_document("node-1", "Sensory node stream", vector=v1)
        self.indexer.index_document("node-2", "Actionable node stream", vector=v2)
        self.indexer.index_document("node-3", "Telemetry fallback stream", vector=v3)

        query = [0.9, 0.1, 0.0, 0.0]
        results = self.indexer.search_vector(query, limit=2)

        self.assertEqual(len(results), 2)
        # Node-1 and Node-3 should have high similarity, Node-1 being highest
        self.assertEqual(results[0][0], "node-1")
        self.assertEqual(results[1][0], "node-3")

    def test_point_in_time_state_recovery(self):
        session_id = "session-abc-123"

        # Register states at progressive timestamps
        t1 = 1000.0
        t2 = 2000.0
        t3 = 3000.0

        self.indexer.register_state_snapshot(session_id, {"nodes": 3, "status": "init"}, timestamp=t1)
        self.indexer.register_state_snapshot(session_id, {"nodes": 5, "status": "running"}, timestamp=t2)
        self.indexer.register_state_snapshot(session_id, {"nodes": 4, "status": "degraded"}, timestamp=t3)

        # Recover state at target point-in-time
        # Before any snapshots
        state_pre = self.indexer.recover_state(session_id, 500.0)
        self.assertIsNone(state_pre)

        # Exactly at t1
        state_t1 = self.indexer.recover_state(session_id, 1000.0)
        self.assertIsNotNone(state_t1)
        self.assertEqual(state_t1["status"], "init")

        # Between t2 and t3
        state_mid = self.indexer.recover_state(session_id, 2500.0)
        self.assertIsNotNone(state_mid)
        self.assertEqual(state_mid["status"], "running")
        self.assertEqual(state_mid["nodes"], 5)

        # Far in future
        state_future = self.indexer.recover_state(session_id, 9999.0)
        self.assertIsNotNone(state_future)
        self.assertEqual(state_future["status"], "degraded")


class TestSecurityPayloadCryptography(unittest.TestCase):
    """
    Unit tests for security/crypto.py: AES-256-GCM encryption & HMAC-SHA256 signing.
    """
    def setUp(self):
        self.secret_bytes = os.urandom(32)
        self.encryptor = PayloadEncryptor(self.secret_bytes)

    def test_encryption_and_decryption_flow(self):
        plaintext = "Confidential Sovereign Operation Command: Execute healing sequence."
        nonce, ciphertext = self.encryptor.encrypt_payload(plaintext)

        self.assertEqual(len(nonce), 12)
        self.assertNotEqual(plaintext, ciphertext.decode("utf-8", errors="ignore"))

        decrypted = self.encryptor.decrypt_payload(nonce, ciphertext)
        self.assertEqual(decrypted, plaintext)

    def test_hmac_signing_and_signature_verification(self):
        payload = b"System-integrity-checkpoint-payload-data"
        sig = self.encryptor.sign_payload(payload)

        self.assertTrue(self.encryptor.verify_signature(payload, sig))

        # Tampered payload
        tampered_payload = b"System-integrity-checkpoint-payload-datA"
        self.assertFalse(self.encryptor.verify_signature(tampered_payload, sig))

        # Tampered signature
        tampered_sig = bytearray(sig)
        tampered_sig[0] ^= 0xFF
        self.assertFalse(self.encryptor.verify_signature(payload, bytes(tampered_sig)))

    def test_secure_wrapping_and_unwrapping_envelope(self):
        original_msg = "Critical health status update: OK."
        envelope = self.encryptor.secure_wrap(original_msg)

        self.assertIn("nonce_hex", envelope)
        self.assertIn("ciphertext_hex", envelope)
        self.assertIn("signature_hex", envelope)

        unwrapped = self.encryptor.secure_unwrap(envelope)
        self.assertEqual(unwrapped, original_msg)

    def test_secure_envelope_tampering_mitigations(self):
        original_msg = "Super secret instruction payload."
        envelope = self.encryptor.secure_wrap(original_msg)

        # 1. Tamper ciphertext
        tampered_envelope = envelope.copy()
        ciphertext_bytes = bytearray.fromhex(tampered_envelope["ciphertext_hex"])
        ciphertext_bytes[-1] ^= 0x01  # Mutate last byte of ciphertext/tag
        tampered_envelope["ciphertext_hex"] = ciphertext_bytes.hex()

        # Verifying should fail because signature won't match, or if signature is updated, decryption fails
        with self.assertRaises(ValueError) as context:
            self.encryptor.secure_unwrap(tampered_envelope)
        self.assertIn("verification failed", str(context.exception))

        # 2. Tamper signature directly
        tampered_sig_envelope = envelope.copy()
        sig_bytes = bytearray.fromhex(tampered_sig_envelope["signature_hex"])
        sig_bytes[0] ^= 0x01
        tampered_sig_envelope["signature_hex"] = sig_bytes.hex()

        with self.assertRaises(ValueError) as context_sig:
            self.encryptor.secure_unwrap(tampered_sig_envelope)
        self.assertIn("verification failed", str(context_sig.exception))

    def test_secure_unwrap_type_handling_robustness(self):
        # Assert that passing a non-dictionary raises ValueError rather than a TypeError
        with self.assertRaises(ValueError) as ctx:
            self.encryptor.secure_unwrap("not-a-dict")
        self.assertIn("Invalid secure envelope format", str(ctx.exception))

        with self.assertRaises(ValueError) as ctx:
            self.encryptor.secure_unwrap(None)
        self.assertIn("Invalid secure envelope format", str(ctx.exception))

        with self.assertRaises(ValueError) as ctx:
            self.encryptor.secure_unwrap([1, 2, 3])
        self.assertIn("Invalid secure envelope format", str(ctx.exception))

        # Assert that dictionary envelopes with non-string fields raise ValueError
        bad_envelope_1 = {
            "nonce_hex": 123,
            "ciphertext_hex": "00ff",
            "signature_hex": "aabb"
        }
        with self.assertRaises(ValueError) as ctx:
            self.encryptor.secure_unwrap(bad_envelope_1)
        self.assertIn("Invalid secure envelope format", str(ctx.exception))

        bad_envelope_2 = {
            "nonce_hex": "00ff",
            "ciphertext_hex": None,
            "signature_hex": "aabb"
        }
        with self.assertRaises(ValueError) as ctx:
            self.encryptor.secure_unwrap(bad_envelope_2)
        self.assertIn("Invalid secure envelope format", str(ctx.exception))

        bad_envelope_3 = {
            "nonce_hex": "00ff",
            "ciphertext_hex": "aabb",
            "signature_hex": ["list-of-things"]
        }
        with self.assertRaises(ValueError) as ctx:
            self.encryptor.secure_unwrap(bad_envelope_3)
        self.assertIn("Invalid secure envelope format", str(ctx.exception))

    def test_verify_signature_type_handling_robustness(self):
        # Assert that verify_signature returns False rather than crashing with TypeError on malformed types
        self.assertFalse(self.encryptor.verify_signature(None, b"abc"))
        self.assertFalse(self.encryptor.verify_signature(b"abc", None))
        self.assertFalse(self.encryptor.verify_signature("string", b"abc"))
        self.assertFalse(self.encryptor.verify_signature(b"abc", "string"))
        self.assertFalse(self.encryptor.verify_signature([1], b"abc"))


if __name__ == "__main__":
    unittest.main()
