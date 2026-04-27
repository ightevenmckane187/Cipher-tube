
# crosspillarreview.rego
# Cipher-tube Governance — Cross-Pillar Review Enforcement

package ciphertube.governance.crosspillarreview

import rego.v1

pillarforpath(path) := "sentinel" if startswith(path, "sentinel/")
pillarforpath(path) := "sentinel" if startswith(path, "security/")
pillarforpath(path) := "sentinel" if startswith(path, "governance/policies/")
pillarforpath(path) := "bolt" if startswith(path, "bolt/")
pillarforpath(path) := "bolt" if startswith(path, "benchmarks/")
pillarforpath(path) := "bolt" if startswith(path, "perf/")
pillarforpath(path) := "palette" if startswith(path, "palette/")
pillarforpath(path) := "palette" if startswith(path, "ui/")
pillarforpath(path) := "palette" if startswith(path, "themes/")
pillarforpath(path) := "tube" if startswith(path, "tube/")
pillarforpath(path) := "tube" if startswith(path, "crypto/")
pillarforpath(path) := "governance" if startswith(path, "governance/")
pillarforpath(path) := "governance" if startswith(path, ".github/")

affected_pillars contains pillar if {
    some path in input.pr.changed_paths
    pillar := pillarforpath(path)
}

approved_pillars contains pillar if {
    some approval in input.pr.approvals
    approval.tier >= 2
    approval.user != input.pr.author
    pillar := approval.pillar
}

maintainer_approved_pillars contains pillar if {
    some approval in input.pr.approvals
    approval.tier >= 3
    approval.user != input.pr.author
    pillar := approval.pillar
}

approver_count := count({a.user |
    some a in input.pr.approvals
    a.user != input.pr.author
})

iscrosspillar if count(affected_pillars) > 1

deny contains msg if {
    some approval in input.pr.approvals
    approval.user == input.pr.author
    msg := sprintf("Self-approval not allowed: %s cannot approve their own PR", [approval.user])
}

deny contains msg if {
    approver_count < 2
    msg := sprintf("Minimum 2 approvals required, got %d", [approver_count])
}

deny contains msg if {
    iscrosspillar
    some pillar in affected_pillars
    not pillar in approved_pillars
    msg := sprintf("Cross-pillar PR missing approval from pillar: %s", [pillar])
}

deny contains msg if {
    not iscrosspillar
    affected_pillars == {"sentinel"}
    not any ({p | p := approved_pillars[_]; p != "sentinel"}) # Simplified check
    # approved_pillars == {"sentinel"}
    msg := "Sentinel-only PRs require at least one reviewer from Bolt or Palette"
}

deny contains msg if {
    not iscrosspillar
    affected_pillars == {"bolt"}
    not "sentinel" in approved_pillars
    msg := "Bolt-only PRs require at least one Sentinel reviewer"
}

deny contains msg if {
    not iscrosspillar
    affected_pillars == {"palette"}
    not "sentinel" in approved_pillars
    msg := "Palette-only PRs require at least one Sentinel reviewer"
}

deny contains msg if {
    "governance" in affected_pillars
    not anyt4approval
    msg := "Governance changes require at least one T4 (project lead) approval"
}

anyt4approval if {
    some approval in input.pr.approvals
    approval.tier >= 4
    approval.user != input.pr.author
}

allow if count(deny) == 0
default allow := false
