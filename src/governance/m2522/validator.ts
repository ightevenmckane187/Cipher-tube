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
    if (!manifest.roles || Array.isArray(manifest.roles) || typeof manifest.roles !== 'object') {
      throw new Error('manifest.roles must be a non-array object');
    }
    for (const [roleId, role] of Object.entries(manifest.roles)) {
      if (typeof role !== 'object' || role === null || Array.isArray(role)) {
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
    if (!manifest.lifecycle_gates || Array.isArray(manifest.lifecycle_gates) || typeof manifest.lifecycle_gates !== 'object') {
      throw new Error('manifest.lifecycle_gates must be a non-array object');
    }
    for (const [gateId, gate] of Object.entries(manifest.lifecycle_gates)) {
      if (typeof gate !== 'object' || gate === null || Array.isArray(gate)) {
        throw new Error(`Lifecycle gate ${gateId} must be an object`);
      }
      const requiredGateFields = ['sentinel_bindings', 'required_signatures', 'required_artifacts'];
      for (const field of requiredGateFields) {
        if (!(field in gate)) {
          throw new Error(`Lifecycle gate ${gateId} is missing required field: ${field}`);
        }
        if (!Array.isArray((gate as any)[field])) {
          throw new Error(`Lifecycle gate ${gateId} ${field} must be an array`);
        }
      }

      if (!Array.isArray((gate as any).sentinel_bindings)) {
        throw new Error(`Lifecycle gate ${gateId} sentinel_bindings must be an array`);
      }
      if (!Array.isArray((gate as any).required_signatures)) {
        throw new Error(`Lifecycle gate ${gateId} required_signatures must be an array`);
      }
      if (!Array.isArray((gate as any).required_artifacts)) {
        throw new Error(`Lifecycle gate ${gateId} required_artifacts must be an array`);
      }

      // Check if signatures reference existing roles
      for (const roleId of (gate as any).required_signatures) {
        if (!(roleId in manifest.roles)) {
          throw new Error(`Lifecycle gate ${gateId} references non-existent role: ${roleId}`);
        }
      }
    }

    // Validate Governance Controls
    if (!manifest.governance_controls || Array.isArray(manifest.governance_controls) || typeof manifest.governance_controls !== 'object') {
      throw new Error('manifest.governance_controls must be a non-array object');
    }
    const hiAi = manifest.governance_controls.high_impact_ai;
    if (!hiAi || typeof hiAi !== 'object' || Array.isArray(hiAi)) {
      throw new Error('Missing or invalid governance_controls.high_impact_ai');
    }
    if (!Array.isArray(hiAi.mandatory_signatures)) {
      throw new Error('governance_controls.high_impact_ai.mandatory_signatures must be an array');
    }
    if (!Array.isArray(hiAi.mandatory_signatures)) {
      throw new Error('mandatory_signatures must be an array');
    }
    for (const roleId of hiAi.mandatory_signatures) {
      if (!(roleId in manifest.roles)) {
        throw new Error(`High Impact AI mandatory signatures reference non-existent role: ${roleId}`);
      }
    }

    return true;
  }
}
