import pytest
from tck.reporting.collector import CompatibilityCollector

@pytest.fixture(scope="session")
def compatibility_collector():
    return CompatibilityCollector()

@pytest.fixture
def transport_clients():
    # Placeholder for actual client initialization
    return {"http_json": None}
