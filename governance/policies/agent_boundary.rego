package ciphertube.governance.agent_boundary

import rego.v1

permittedagentactions := {"read", "analyze", "comment", "report"}
prohibitedagentactions := {"merge", "branchdelete", "cimodify", "governance_modify", "promote", "release"}

deny contains msg if {
    not startswith(input.agent.token_signature, "ed25519:")
    msg := sprintf(
        "Agent '%s' must authenticate with Ed25519-signed token. Got: %s",
        [input.agent.id, input.agent.token_signature]
    )
}

deny contains msg if {
    time.parse_rfc3339_ns(input.agent.token_expiry) < time.parse_rfc3339_ns(input.current_time)
    msg := sprintf(
        "Agent '%s' token expired at %s (current: %s)",
        [input.agent.id, input.agent.token_expiry, input.current_time]
    )
}

deny contains msg if {
    input.action.type in prohibitedagentactions
    msg := sprintf(
        "Automated agent '%s' is permanently prohibited from action: %s",
        [input.agent.id, input.action.type]
    )
}

deny contains msg if {
    not input.action.type in permittedagentactions
    not input.action.type in prohibitedagentactions
    msg := sprintf(
        "Unknown action '%s' for agent '%s'. Permitted: %v",
        [input.action.type, input.agent.id, permittedagentactions]
    )
}

deny contains msg if {
    input.action.target_pillar != input.agent.pillar
    not input.agent.crosspillargrant
    msg := sprintf(
        "Agent '%s' (%s) cannot access pillar '%s' without cross-pillar grant from T4 lead",
        [input.agent.id, input.agent.pillar, input.action.target_pillar]
    )
}

deny contains msg if {
    input.agent.crosspillargrant
    input.action.type in prohibitedagentactions
    msg := sprintf(
        "Cross-pillar grant does not permit action '%s' — permanently prohibited for agents",
        [input.action.type]
    )
}

audit_required if {
    input.action.type in permittedagentactions
}

allow if count(deny) == 0
default allow := false

# Compatibility with agentboundarytest.rego
tokenvalid if {
    startswith(input.agent.token.algorithm, "Ed25519")
    input.current_time < input.agent.token.expires_at
}

actionpermitted if {
    tokenvalid
    input.action in permittedagentactions
    not input.action in prohibitedagentactions
}

pillaraccessgranted if {
    input.action.target_pillar == input.agent.pillar
}
pillaraccessgranted if {
    some p in input.agent.crosspillargrants
    p == input.action.target_pillar
}

# Mapping for the test that uses pillaraccess_granted (with underscore)
pillaraccess_granted if pillaraccessgranted
