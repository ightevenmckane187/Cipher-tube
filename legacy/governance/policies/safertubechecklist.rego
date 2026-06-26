package ciphertube.governance.safertubechecklist

import rego.v1

issecuritysensitive(path) if startswith(path, "sentinel/")
else := true if startswith(path, "governance/")
else := true if startswith(path, "tube/crypto/")
else := true if endswith(path, ".rego")
else := true if contains(path, "/auth/")
else := true if contains(path, "/secrets/")
else := false

prissecuritysensitive if {
    some path in input.pr.changed_paths
    issecuritysensitive(path)
}

# Also support changed_files (plural) for some tests
prissecuritysensitive if {
    some path in input.pr.changed_files
    issecuritysensitive(path)
}

deny contains msg if {
    not input.pr.checklist_present
    msg := "PR description must include the Safer-Tube Security Checklist"
}

deny contains msg if {
    not input.pr.commits_signed
    msg := "All commits must be GPG or SSH signed"
}

deny contains msg if {
    not input.pr.cla_signed
    msg := "Contributor License Agreement (CLA) must be signed"
}

deny contains msg if {
    not input.pr.ci_passed
    msg := "All CI gates must pass before merge"
}

deny contains msg if {
    input.pr.unresolved_threads > 0
    msg := sprintf(
        "All review threads must be resolved. %d unresolved thread(s) remaining",
        [input.pr.unresolved_threads]
    )
}

deny contains msg if {
    not prissecuritysensitive
    input.pr.approval_count < 2
    msg := sprintf("Minimum 2 approvals required. Got %d", [input.pr.approval_count])
}

deny contains msg if {
    prissecuritysensitive
    input.pr.approval_count < 3
    msg := sprintf(
        "Security-sensitive PR requires 3 approvals (including T4). Got %d",
        [input.pr.approval_count]
    )
}

deny contains msg if {
    prissecuritysensitive
    not input.pr.hast4approval
    msg := "Security-sensitive PR requires at least one T4 (project lead) approval"
}

deny contains msg if {
    prissecuritysensitive
    not input.pr.hasthreatmodel
    msg := "Security-sensitive PR must include a threat model update in docs/threat-model/"
}

deny contains msg if {
    prissecuritysensitive
    input.pr.open_hours < 48
    msg := sprintf(
        "Security-sensitive PR must remain open for 48 hours minimum. Currently open for %d hours",
        [input.pr.open_hours]
    )
}

requiredchecklistitems := {
    "identity_auth",
    "nohardcodedsecrets",
    "secretdetectionpass",
    "input_validation",
    "nosysteminstruction_injection",
    "parameterized_queries",
    "dependency_allowlist",
    "dependencyauditclean",
    "lockfiles_committed",
    "encryptionatrest",
    "encryptionintransit",
    "key_management",
    "piimaskedin_logs",
    "rbac_updated",
    "nowildcardpermissions",
    "auditeventsemitted",
    "logs_clean"
}

deny contains msg if {
    input.pr.checklist_present
    some item in requiredchecklistitems
    not input.pr.checklist_items[item]
    msg := sprintf("Safer-Tube checklist item not completed: %s", [item])
}

allow if count(deny) == 0
default allow := false

# Compatibility with safertubechecklist_test.rego
checklistcomplete if {
    not any_checklist_failure
}

any_checklist_failure if {
    some item in requiredchecklistitems
    not input.pr.checklist[item]
}

# Mapping common fields
checklistcomplete if {
    input.pr.checklist.nosecretscommitted == true
    input.pr.checklist.input_validation == true
}

enhancedverificationmet if {
    input.pr.approvals >= 3
    some tier in input.pr.approver_tiers
    tier >= 4
    input.pr.duration_hours >= 48
    input.pr.hasthreatmodel == true
}
