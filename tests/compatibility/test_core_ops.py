import pytest
import subprocess
import time
import httpx
from tck.transport.http_json import HttpJsonTransport
from tck.runner.executor import Runner
from codegen.parser import Parser

@pytest.fixture(scope="module")
def sut_server():
    # Start the generated SUT
    port = 8081
    process = subprocess.Popen(
        ["uv", "run", "python3", "sut/a2a-python/sut.py", str(port)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    # Wait for server to start
    base_url = f"http://localhost:{port}"
    max_retries = 10
    for i in range(max_retries):
        try:
            httpx.get(f"{base_url}/agent-card")
            break
        except Exception:
            time.sleep(0.5)
    else:
        process.kill()
        raise RuntimeError("SUT failed to start")

    yield base_url

    process.terminate()
    process.wait()

@pytest.mark.asyncio
@pytest.mark.http_json
@pytest.mark.must
@pytest.mark.core_ops
async def test_ping_compatibility(sut_server, compatibility_collector):
    transport = HttpJsonTransport(base_url=sut_server)
    runner = Runner(transport, compatibility_collector)

    parser = Parser()
    with open("scenarios/core_operations/ping.feature", "r") as f:
        feature_text = f.read()

    scenarios = parser.parse_feature(feature_text)

    for scenario in scenarios:
        await runner.run_scenario(scenario)

    # Verify results
    results = compatibility_collector.get_report()
    assert len(results) >= 1
    ping_result = next(r for r in results if r.requirement_id == "CORE-OPS-001")
    assert ping_result.passed is True

    await transport.close()
