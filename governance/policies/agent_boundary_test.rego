package ciphertube.governance.agent_boundary_test

import rego.v1
import data.ciphertube.governance.agent_boundary

test_agent_allowed_in_pillar if {
    agent_boundary.allow with input as {
        "agent": {
            "id": "sentinel-bot",
            "pillar": "sentinel",
            "token_signature": "ed25519:valid",
            "token_expiry": "2026-05-01T00:00:00Z",
            "crosspillargrant": false
        },
        "action": {
            "type": "analyze",
            "target_pillar": "sentinel"
        },
        "current_time": "2026-04-27T00:00:00Z"
    }
}

test_agent_denied_cross_pillar if {
    not agent_boundary.allow with input as {
        "agent": {
            "id": "sentinel-bot",
            "pillar": "sentinel",
            "token_signature": "ed25519:valid",
            "token_expiry": "2026-05-01T00:00:00Z",
            "crosspillargrant": false
        },
        "action": {
            "type": "analyze",
            "target_pillar": "bolt"
        },
        "current_time": "2026-04-27T00:00:00Z"
    }
}
