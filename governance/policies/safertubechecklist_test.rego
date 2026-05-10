package ciphertube.safertubechecklist_test

import rego.v1
import data.ciphertube.governance.safertubechecklist

standard_pr := {
    "pr": {
        "changed_files": ["bolt/src/handler.ts", "bolt/tests/handler.test.ts"],
        "checklist": {
            "identity_auth": true, "nohardcodedsecrets": true, "secretdetectionpass": true,
            "input_validation": true, "nosysteminstruction_injection": true,
            "parameterized_queries": true, "dependency_allowlist": true,
            "dependencyauditclean": true, "lockfiles_committed": true,
            "encryptionatrest": true, "encryptionintransit": true,
            "key_management": true, "piimaskedin_logs": true,
            "rbac_updated": true, "nowildcardpermissions": true,
            "auditeventsemitted": true, "logs_clean": true,
            "nosecretscommitted": true # for back compat
        },
        "approvals": 2,
        "approver_tiers": [3, 2],
        "duration_hours": 24,
        "hasthreatmodel": false
    }
}

security_sensitive_pr := {
    "pr": {
        "changed_files": [
            "governance/policies/trust_tier.rego",
            "tube/crypto/cert-rotation.ts"
        ],
        "checklist": {
             "identity_auth": true, "nohardcodedsecrets": true, "secretdetectionpass": true,
            "input_validation": true, "nosysteminstruction_injection": true,
            "parameterized_queries": true, "dependency_allowlist": true,
            "dependencyauditclean": true, "lockfiles_committed": true,
            "encryptionatrest": true, "encryptionintransit": true,
            "key_management": true, "piimaskedin_logs": true,
            "rbac_updated": true, "nowildcardpermissions": true,
            "auditeventsemitted": true, "logs_clean": true
        },
        "approvals": 3,
        "approver_tiers": [4, 3, 3],
        "duration_hours": 50,
        "hasthreatmodel": true
    }
}

test_governance_policy_path_is_sensitive if {
    safertubechecklist.issecuritysensitive("governance/policies/trust_tier.rego")
}

test_standard_pr_passes_checklist if {
    safertubechecklist.checklistcomplete with input as standard_pr
}

test_security_pr_passes_enhanced_verification if {
    safertubechecklist.enhancedverificationmet with input as security_sensitive_pr
}

test_security_pr_fails_without_t4_approver if {
    pr_no_t4 := object.union(security_sensitive_pr, {"pr": {"approver_tiers": [3, 3, 3]}})
    not safertubechecklist.enhancedverificationmet with input as pr_no_t4
}

test_standard_pr_skips_enhanced_verification if {
    not safertubechecklist.prissecuritysensitive with input as standard_pr
}
