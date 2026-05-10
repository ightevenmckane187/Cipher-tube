package ciphertube.trusttiertest

import rego.v1
import data.ciphertube.governance.trust_tier

test_t0_can_read if {
    trust_tier.allowed_actions["read"] with input as {
        "contributor": {
            "trust_tier": 0,
            "pillar": "bolt"
        },
        "action": "read"
    }
}

test_t0_cannot_merge if {
    not trust_tier.allowed_actions["merge"] with input as {
        "contributor": {
            "trust_tier": 0,
            "pillar": "bolt"
        },
        "action": "merge"
    }
}

test_t0_cannot_approve if {
    not trust_tier.allowed_actions["approve"] with input as {
        "contributor": {
            "trust_tier": 0,
            "pillar": "bolt"
        },
        "action": "approve"
    }
}

test_t1_can_comment if {
    trust_tier.allowed_actions["comment"] with input as {
        "contributor": {
            "trust_tier": 1,
            "pillar": "palette"
        },
        "action": "comment"
    }
}

test_t1_can_submit_pr if {
    trust_tier.allowed_actions["pr"] with input as {
        "contributor": {
            "trust_tier": 1,
            "pillar": "sentinel"
        },
        "action": "pr"
    }
}

test_t2_can_approve_own_pillar if {
    trust_tier.allowed_actions["approve"] with input as {
        "contributor": {
            "trust_tier": 2,
            "pillar": "bolt"
        },
        "action": "approve",
        "target_pillar": "bolt"
    }
}

test_t3_can_merge if {
    trust_tier.allowed_actions["merge"] with input as {
        "contributor": {
            "trust_tier": 3,
            "pillar": "sentinel"
        },
        "action": "merge"
    }
}

test_automated_agent_cannot_merge if {
    not trust_tier.allowed_actions["merge"] with input as {
        "contributor": {
            "trust_tier": 2,
            "pillar": "bolt",
            "is_automated": true
        },
        "action": "merge"
    }
}
