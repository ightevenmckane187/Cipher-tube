export interface AuthorityChainManifest {
  version: string;
  framework: string;
  owner: string;
  description: string;
  roles: Record<string, RoleDefinition>;
  lifecycle_gates: Record<string, LifecycleGate>;
  governance_controls: GovernanceControls;
  escalation_paths: Record<string, EscalationPath>;
}

export interface RoleDefinition {
  name: string;
  permissions: string[];
}

export interface LifecycleGate {
  sentinel_bindings: string[];
  required_signatures: string[];
  required_artifacts: string[];
}

export interface GovernanceControls {
  high_impact_ai: {
    conditions: string[];
    mandatory_signatures: string[];
    mandatory_artifacts: string[];
  };
  vendor_lockin_prevention: {
    mandatory_artifacts: string[];
  };
}

export interface EscalationPath {
  trigger: string;
  notify: string[];
}
