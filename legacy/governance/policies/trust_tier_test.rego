package ciphertube.governance.trust_tier_test

import rego.v1
import data.ciphertube.governance.trust_tier

test_read_allowed_for_t0 if {
    trust_tier.allow with input as {
        "actor": {"user": "alice", "tier": 0, "type": "human"},
        "action": {"type": "read"}
    }
}

test_merge_denied_for_t2 if {
    not trust_tier.allow with input as {
        "actor": {"user": "alice", "tier": 2, "type": "human"},
        "action": {"type": "merge"}
    }
}

test_automated_merge_prohibited if {
    not trust_tier.allow with input as {
        "actor": {"user": "bot", "tier": 3, "type": "automated"},
        "action": {"type": "merge"}
    }
}
