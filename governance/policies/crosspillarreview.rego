package ciphertube.governance.crosspillarreview

import rego.v1

all_changed_files contains path if { some path in input.pr.changed_paths }
all_changed_files contains path if { some path in input.pr.changed_files }
all_changed_files contains path if { some path in input.pr.changedpaths }

affected_pillars contains "sentinel" if {
    some path in all_changed_files
    startswith(path, "sentinel/")
}
affected_pillars contains "sentinel" if {
    some path in all_changed_files
    startswith(path, "security/")
}
affected_pillars contains "sentinel" if {
    some path in all_changed_files
    startswith(path, "governance/policies/")
}
affected_pillars contains "sentinel" if {
    some path in all_changed_files
    startswith(path, "tube/crypto/")
}

affected_pillars contains "bolt" if {
    some path in all_changed_files
    startswith(path, "bolt/")
}
affected_pillars contains "bolt" if {
    some path in all_changed_files
    startswith(path, "benchmarks/")
}
affected_pillars contains "bolt" if {
    some path in all_changed_files
    startswith(path, "perf/")
}
affected_pillars contains "bolt" if {
    some path in all_changed_files
    startswith(path, "tube/")
}

affected_pillars contains "palette" if {
    some path in all_changed_files
    startswith(path, "palette/")
}
affected_pillars contains "palette" if {
    some path in all_changed_files
    startswith(path, "ui/")
}
affected_pillars contains "palette" if {
    some path in all_changed_files
    startswith(path, "themes/")
}
affected_pillars contains "palette" if {
    some path in all_changed_files
    startswith(path, "tube/")
}

affected_pillars contains "governance" if {
    some path in all_changed_files
    startswith(path, "governance/")
}
affected_pillars contains "governance" if {
    some path in all_changed_files
    startswith(path, ".github/")
}

approved_pillars contains pillar if {
    some approval in input.pr.approvals
    approval.tier >= 2
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
    some p in affected_pillars
    not approved_pillars[p]
    msg := sprintf("Cross-pillar PR missing approval from pillar: %s", [p])
}

deny contains msg if {
    not iscrosspillar
    affected_pillars == {"sentinel"}
    not approved_pillars["bolt"]
    not approved_pillars["palette"]
    msg := "Sentinel-only PRs require at least one reviewer from Bolt or Palette"
}

deny contains msg if {
    not iscrosspillar
    affected_pillars == {"bolt"}
    not approved_pillars["sentinel"]
    msg := "Bolt-only PRs require at least one Sentinel reviewer"
}

deny contains msg if {
    not iscrosspillar
    affected_pillars == {"palette"}
    not approved_pillars["sentinel"]
    msg := "Palette-only PRs require at least one Sentinel reviewer"
}

deny contains msg if {
    affected_pillars["governance"]
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
