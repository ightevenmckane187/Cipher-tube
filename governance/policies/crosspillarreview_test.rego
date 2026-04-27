package ciphertube.governance.crosspillarreview_test

import rego.v1
import data.ciphertube.governance.crosspillarreview

test_crosspillar_allow if {
    crosspillarreview.allow with input as {
        "pr": {
            "changed_paths": ["sentinel/auth/token.go", "bolt/bench/latency.go"],
            "approvals": [
                {"user": "alice", "pillar": "sentinel", "tier": 3},
                {"user": "carol", "pillar": "bolt", "tier": 3}
            ],
            "author": "bob",
            "target_branch": "main"
        }
    }
}

test_selfapproval_denied if {
    not crosspillarreview.allow with input as {
        "pr": {
            "changed_paths": ["sentinel/auth/token.go"],
            "approvals": [
                {"user": "bob", "pillar": "sentinel", "tier": 3},
                {"user": "carol", "pillar": "bolt", "tier": 2}
            ],
            "author": "bob",
            "target_branch": "main"
        }
    }
}

test_insufficient_approvals if {
    not crosspillarreview.allow with input as {
        "pr": {
            "changed_paths": ["bolt/bench/latency.go"],
            "approvals": [
                {"user": "alice", "pillar": "bolt", "tier": 3}
            ],
            "author": "bob",
            "target_branch": "main"
        }
    }
}

test_sentinelonlyneedscross_pillar if {
    not crosspillarreview.allow with input as {
        "pr": {
            "changed_paths": ["sentinel/auth/token.go"],
            "approvals": [
                {"user": "alice", "pillar": "sentinel", "tier": 3},
                {"user": "dave", "pillar": "sentinel", "tier": 2}
            ],
            "author": "bob",
            "target_branch": "main"
        }
    }
}

test_governance_needs_t4 if {
    not crosspillarreview.allow with input as {
        "pr": {
            "changed_paths": ["governance/policies/newrule.rego"],
            "approvals": [
                {"user": "alice", "pillar": "sentinel", "tier": 3},
                {"user": "carol", "pillar": "bolt", "tier": 3}
            ],
            "author": "bob",
            "target_branch": "main"
        }
    }
}

test_governance_with_t4_allow if {
    crosspillarreview.allow with input as {
        "pr": {
            "changed_paths": ["governance/policies/newrule.rego"],
            "approvals": [
                {"user": "alice", "pillar": "sentinel", "tier": 4},
                {"user": "carol", "pillar": "governance", "tier": 3}
            ],
            "author": "bob",
            "target_branch": "main"
        }
    }
}

test_bolt_only_needs_sentinel if {
    not crosspillarreview.allow with input as {
        "pr": {
            "changed_paths": ["bolt/bench/latency.go"],
            "approvals": [
                {"user": "alice", "pillar": "bolt", "tier": 3},
                {"user": "dave", "pillar": "bolt", "tier": 2}
            ],
            "author": "bob",
            "target_branch": "main"
        }
    }
}

test_bolt_only_with_sentinel_allow if {
    crosspillarreview.allow with input as {
        "pr": {
            "changed_paths": ["bolt/bench/latency.go"],
            "approvals": [
                {"user": "alice", "pillar": "bolt", "tier": 3},
                {"user": "dave", "pillar": "sentinel", "tier": 2}
            ],
            "author": "bob",
            "target_branch": "main"
        }
    }
}
