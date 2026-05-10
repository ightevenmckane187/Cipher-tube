package ciphertube.governance.trust_tier

import rego.v1

allowedactionsfortier(0) := {"read", "issue", "discuss", "comment"}
allowedactionsfortier(1) := {"read", "issue", "discuss", "comment", "pr", "reviewrequest"}
allowedactionsfortier(2) := {"read", "issue", "discuss", "comment", "pr", "reviewrequest", "approve", "triage"}
allowedactionsfortier(3) := {"read", "issue", "discuss", "comment", "pr", "reviewrequest", "approve", "triage", "merge", "release", "ci_config", "revoke_agent"}
allowedactionsfortier(4) := {"read", "issue", "discuss", "comment", "pr", "reviewrequest", "approve", "triage", "merge", "release", "ci_config", "revoke_agent", "governance", "promote", "escalate", "governance_modify"}

deny contains msg if {
    not input.action.type in allowedactionsfortier(input.actor.tier)
    msg := sprintf(
        "Action '%s' requires higher trust tier. Actor '%s' is T%d, needs T%d+",
        [input.action.type, input.actor.user, input.actor.tier, mintierforaction(input.action.type)]
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
    input.action.type in {"merge", "governance", "promote", "branchdelete", "ciconfig", "governance_modify"}
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

mintierforaction("read") := 0
mintierforaction("issue") := 0
mintierforaction("discuss") := 0
mintierforaction("comment") := 0
mintierforaction("pr") := 1
mintierforaction("reviewrequest") := 1
mintierforaction("approve") := 2
mintierforaction("triage") := 2
mintierforaction("merge") := 3
mintierforaction("release") := 3
mintierforaction("ciconfig") := 3
mintierforaction("revoke_agent") := 3
mintierforaction("governance") := 4
mintierforaction("promote") := 4
mintierforaction("escalate") := 4
mintierforaction("governance_modify") := 4

allow if count(deny) == 0
default allow := false

# Compatibility with trusttiertest.rego
allowed_actions contains action if {
    tier := object.get(input.contributor, "trust_tier", 0)
    some action in allowedactionsfortier(tier)
    not is_restricted_automated_action(action)
}

is_restricted_automated_action(action) if {
    input.contributor.is_automated == true
    action in {"merge", "governance", "promote", "branchdelete", "ciconfig", "governance_modify"}
}
