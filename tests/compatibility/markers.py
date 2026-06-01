import pytest
from tck.requirements.base import RequirementLevel

def pytest_configure(config):
    config.addinivalue_line("markers", "grpc: gRPC transport")
    config.addinivalue_line("markers", "jsonrpc: JSON-RPC transport")
    config.addinivalue_line("markers", "http_json: HTTP+JSON transport")
    config.addinivalue_line("markers", "must: MUST requirement")
    config.addinivalue_line("markers", "should: SHOULD requirement")
    config.addinivalue_line("markers", "may: MAY requirement")
    config.addinivalue_line("markers", "core_ops: CORE-OPS requirements")
