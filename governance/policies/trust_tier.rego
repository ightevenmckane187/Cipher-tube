
# trust_tier.rego
# Cipher-tube Governance — Trust Tier Enforcement

package ciphertube.governance.trust_tier

import rego.v1

allowed_actions_for_tier(0) := {"read", "issue", "discuss"}
allowed_actions_for_tier(1) := {"read", "issue", "discuss", "pr", "reviewrequest"}
allowed_actions_for_tier(2) := {"read", "issue", "discuss", "pr", "reviewrequest", "approve", "triage"}
allowed_actions_for_tier(3) := {"read", "issue", "discuss", "pr", "reviewrequest", "approve", "triage", "merge", "release", "ci_config"}
allowed_actions_for_tier(4) := {"read", "issue", "discuss", "pr", "reviewrequest", "approve", "triage", "merge", "release", "ci_config", "governance", "promote", "escalate"}

deny contains msg if {
    not input.action.type in allowed_actions_for_tier(input.actor.tier)
    msg := sprintf(
        "Action '%s' requires higher trust tier. Actor '%s' is T%d, needs T%d+",
        [input.action.type, input.actor.user, input.actor.tier, min_tier_for_action(input.action.type)]
    )
}

deny contains msg if {
    input.actor.tier == 2
    input.action.scope != input.actor.pillar
    input.action.type in {"approve", "triage"}
    msg := sprintf(
        "T2 agent '%s' (%s) cannot %s outside their pillar (%s != %s)",
        [input.actor.user, input.actor.pillar, input.action.type, input.action.scope, input.actor.pillar]
    )
}

deny contains msg if {
    input.actor.type == "automated"
    input.action.type in {"merge", "governance", "promote", "branchdelete", "ciconfig"}
    msg := sprintf(
        "Automated agent '%s' is prohibited from action: %s",
        [input.actor.user, input.action.type]
    )
}

deny contains msg if {
    input.action.type == "governance"
    input.actor.tier < 4
    msg := sprintf(
        "Governance changes require T4 (project lead). Actor '%s' is T%d",
        [input.actor.user, input.actor.tier]
    )
}

deny contains msg if {
    input.action.type == "promote"
    input.actor.tier < 4
    msg := sprintf(
        "Trust-tier promotions require T4 (project lead). Actor '%s' is T%d",
        [input.actor.user, input.actor.tier]
    )
}

min_tier_for_action("read") := 0
min_tier_for_action("issue") := 0
min_tier_for_action("discuss") := 0
min_tier_for_action("pr") := 1
min_tier_for_action("reviewrequest") := 1
min_tier_for_action("approve") := 2
min_tier_for_action("triage") := 2
min_tier_for_action("merge") := 3
min_tier_for_action("release") := 3
min_tier_for_action("ciconfig") := 3
min_tier_for_action("governance") := 4
min_tier_for_action("promote") := 4
min_tier_for_action("escalate") := 4

allow if count(deny) == 0
default allow := false
