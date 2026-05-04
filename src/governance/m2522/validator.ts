import { AuthorityChainManifest } from './types';

export class AuthorityChainValidator {
  public static validate(manifest: any): manifest is AuthorityChainManifest {
    if (!manifest || typeof manifest !== 'object') {
      throw new Error('Manifest must be an object');
    }

    const requiredRootFields = ['version', 'framework', 'owner', 'roles', 'lifecycle_gates', 'governance_controls', 'escalation_paths'];
    for (const field of requiredRootFields) {
      if (!(field in manifest)) {
        throw new Error(`Missing required root field: ${field}`);
      }
    }

    // Validate Roles
    for (const [roleId, role] of Object.entries(manifest.roles)) {
      if (typeof role !== 'object' || role === null) {
        throw new Error(`Role ${roleId} must be an object`);
      }
      if (!('name' in role) || !('permissions' in role)) {
        throw new Error(`Role ${roleId} is missing required fields`);
      }
      if (!Array.isArray((role as any).permissions)) {
        throw new Error(`Role ${roleId} permissions must be an array`);
      }
    }

    // Validate Lifecycle Gates
    for (const [gateId, gate] of Object.entries(manifest.lifecycle_gates)) {
      if (typeof gate !== 'object' || gate === null) {
        throw new Error(`Lifecycle gate ${gateId} must be an object`);
      }
      const requiredGateFields = ['sentinel_bindings', 'required_signatures', 'required_artifacts'];
      for (const field of requiredGateFields) {
        if (!(field in gate)) {
          throw new Error(`Lifecycle gate ${gateId} is missing required field: ${field}`);
        }
      }

      // Check if signatures reference existing roles
      for (const roleId of (gate as any).required_signatures) {
        if (!(roleId in manifest.roles)) {
          throw new Error(`Lifecycle gate ${gateId} references non-existent role: ${roleId}`);
        }
      }
    }

    // Validate Governance Controls
    const hiAi = manifest.governance_controls.high_impact_ai;
    if (!hiAi || typeof hiAi !== 'object') {
      throw new Error('Missing governance_controls.high_impact_ai');
    }
    for (const roleId of hiAi.mandatory_signatures) {
      if (!(roleId in manifest.roles)) {
        throw new Error(`High Impact AI mandatory signatures reference non-existent role: ${roleId}`);
      }
    }

    return true;
  }
}
