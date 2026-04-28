package ciphertube.agentboundarytest

import rego.v1
import data.ciphertube.governance.agent_boundary

valid_agent := {
    "agent": {
        "id": "sentinel-scanner-01",
        "pillar": "sentinel",
        "token": {
            "algorithm": "Ed25519",
            "issued_at": 1745700000,
            "expires_at": 1745800000,
            "issuer": "cipher-tube-sentinel"
        }
    },
    "current_time": 1745750000
}

expired_agent := {
    "agent": {
        "id": "bolt-analyzer-01",
        "pillar": "bolt",
        "token": {
            "algorithm": "Ed25519",
            "issued_at": 1745700000,
            "expires_at": 1745710000,
            "issuer": "cipher-tube-bolt"
        }
    },
    "current_time": 1745750000
}

test_valid_ed25519_token_accepted if {
    agent_boundary.tokenvalid with input as valid_agent
}

test_non_ed25519_token_rejected if {
    not agent_boundary.tokenvalid with input as {
        "agent": {
            "id": "rogue-agent",
            "pillar": "bolt",
            "token": {
                "algorithm": "RSA",
                "issued_at": 1745700000,
                "expires_at": 1745800000,
                "issuer": "cipher-tube-bolt"
            }
        },
        "current_time": 1745750000
    }
}

test_expired_token_rejected if {
    not agent_boundary.tokenvalid with input as expired_agent
}

test_agent_can_read if {
    agent_boundary.actionpermitted with input as object.union(valid_agent, {"action": "read"})
}

test_agent_cannot_merge if {
    not agent_boundary.actionpermitted with input as object.union(valid_agent, {"action": "merge"})
}

test_agent_allowed_in_own_pillar if {
    agent_boundary.pillaraccessgranted with input as object.union(valid_agent, {
        "action": {"target_pillar": "sentinel"}
    })
}

test_agent_denied_cross_pillar_without_grant if {
    not agent_boundary.pillaraccessgranted with input as object.union(valid_agent, {
        "action": {"target_pillar": "bolt"}
    })
}

test_agent_allowed_cross_pillar_with_explicit_grant if {
    agent_boundary.pillaraccess_granted with input as {
        "agent": {
            "id": "sentinel-scanner-01",
            "pillar": "sentinel",
            "crosspillargrants": ["bolt"],
            "token": {
                "algorithm": "Ed25519",
                "issued_at": 1745700000,
                "expires_at": 1745800000,
                "issuer": "cipher-tube-sentinel"
            }
        },
        "current_time": 1745750000,
        "action": {"target_pillar": "bolt"}
    }
}
