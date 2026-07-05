import { AuthorityChainManifest } from "./types";

export class AuthorityChainValidator {
  public static validate(manifest: any): manifest is AuthorityChainManifest {
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      throw new Error("Manifest must be an object");
    }

    const requiredRootFields = [
      "version",
      "framework",
      "owner",
      "roles",
      "lifecycle_gates",
      "governance_controls",
      "escalation_paths",
    ];
    for (const field of requiredRootFields) {
      if (!Object.prototype.hasOwnProperty.call(manifest, field)) {
        throw new Error(`Missing required root field: ${field}`);
      }
    }

    const FORBIDDEN_KEYS = ["__proto__", "constructor", "prototype"];
    const isValidKey = (key: string) => !FORBIDDEN_KEYS.includes(key);

    // Validate Roles
    if (
      !manifest.roles ||
      Array.isArray(manifest.roles) ||
      typeof manifest.roles !== "object"
    ) {
      throw new Error("manifest.roles must be a non-array object");
    }
    for (const [roleId, role] of Object.entries(manifest.roles)) {
      if (!isValidKey(roleId)) {
        throw new Error(`Invalid key in roles: ${roleId}`);
      }
      if (typeof role !== "object" || role === null || Array.isArray(role)) {
        throw new Error(`Role ${roleId} must be an object`);
      }
      if (
        !Object.prototype.hasOwnProperty.call(role, "name") ||
        !Object.prototype.hasOwnProperty.call(role, "permissions")
      ) {
        throw new Error(`Role ${roleId} is missing required fields`);
      }
      if (!Array.isArray((role as any).permissions)) {
        throw new Error(`Role ${roleId} permissions must be an array`);
      }
    }

    // Validate Lifecycle Gates
    if (
      !manifest.lifecycle_gates ||
      Array.isArray(manifest.lifecycle_gates) ||
      typeof manifest.lifecycle_gates !== "object"
    ) {
      throw new Error("manifest.lifecycle_gates must be a non-array object");
    }
    for (const [gateId, gate] of Object.entries(manifest.lifecycle_gates)) {
      if (!isValidKey(gateId)) {
        throw new Error(`Invalid key in lifecycle_gates: ${gateId}`);
      }
      if (typeof gate !== "object" || gate === null || Array.isArray(gate)) {
        throw new Error(`Lifecycle gate ${gateId} must be an object`);
      }
      const requiredGateFields = [
        "sentinel_bindings",
        "required_signatures",
        "required_artifacts",
      ];
      for (const field of requiredGateFields) {
        if (!Object.prototype.hasOwnProperty.call(gate, field)) {
          throw new Error(
            `Lifecycle gate ${gateId} is missing required field: ${field}`,
          );
        }
        if (!Array.isArray((gate as any)[field])) {
          throw new Error(`Lifecycle gate ${gateId} ${field} must be an array`);
        }
      }

      // Check if signatures reference existing roles
      for (const roleId of (gate as any).required_signatures) {
        if (!Object.prototype.hasOwnProperty.call(manifest.roles, roleId)) {
          throw new Error(
            `Lifecycle gate ${gateId} references non-existent role: ${roleId}`,
          );
        }
      }
    }

    // Validate Governance Controls
    if (
      !manifest.governance_controls ||
      Array.isArray(manifest.governance_controls) ||
      typeof manifest.governance_controls !== "object"
    ) {
      throw new Error(
        "manifest.governance_controls must be a non-array object",
      );
    }
    const hiAi = manifest.governance_controls.high_impact_ai;
    if (!hiAi || typeof hiAi !== "object" || Array.isArray(hiAi)) {
      throw new Error("Missing or invalid governance_controls.high_impact_ai");
    }
    if (!Array.isArray(hiAi.mandatory_signatures)) {
      throw new Error(
        "governance_controls.high_impact_ai.mandatory_signatures must be an array",
      );
    }
    for (const roleId of hiAi.mandatory_signatures) {
      if (!Object.prototype.hasOwnProperty.call(manifest.roles, roleId)) {
        throw new Error(
          `High Impact AI mandatory signatures reference non-existent role: ${roleId}`,
        );
      }
    }

    const vlp = manifest.governance_controls.vendor_lockin_prevention;
    if (!vlp || typeof vlp !== "object" || Array.isArray(vlp)) {
      throw new Error(
        "Missing or invalid governance_controls.vendor_lockin_prevention",
      );
    }
    if (!Array.isArray(vlp.mandatory_artifacts)) {
      throw new Error(
        "governance_controls.vendor_lockin_prevention.mandatory_artifacts must be an array",
      );
    }

    // Validate Escalation Paths
    if (
      !manifest.escalation_paths ||
      Array.isArray(manifest.escalation_paths) ||
      typeof manifest.escalation_paths !== "object"
    ) {
      throw new Error("manifest.escalation_paths must be a non-array object");
    }
    for (const [pathId, path] of Object.entries(manifest.escalation_paths)) {
      if (!isValidKey(pathId)) {
        throw new Error(`Invalid key in escalation_paths: ${pathId}`);
      }
      if (typeof path !== "object" || path === null || Array.isArray(path)) {
        throw new Error(`Escalation path ${pathId} must be an object`);
      }
      if (!Object.prototype.hasOwnProperty.call(path, "trigger")) {
        throw new Error(
          `Escalation path ${pathId} is missing required field: trigger`,
        );
      }
      if (
        !Object.prototype.hasOwnProperty.call(path, "notify") ||
        !Array.isArray((path as any).notify)
      ) {
        throw new Error(`Escalation path ${pathId} notify must be an array`);
      }
    }

    return true;
  }
}
