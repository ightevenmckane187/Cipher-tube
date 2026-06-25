import { AuthorityChainLoader } from './m2522/loader';
import { AuthorityChainManifest } from './m2522/types';

/**
 * Compliance-Gatekeeper (M-25-22 logic)
 * Enforces federal zero-trust compliance gates for the CypherTube architecture.
 */
export class ComplianceGatekeeper {
  private manifest: AuthorityChainManifest;

  constructor() {
    this.manifest = AuthorityChainLoader.load();
  }

  public verifyGate(gateId: string, artifacts: string[], signatures: string[]): boolean {
    const gate = this.manifest.lifecycle_gates[gateId];
    if (!gate) {
      console.warn(`[Gatekeeper] Lifecycle gate not found: ${gateId}`);
      return false;
    }
    return this.checkGateRequirements(gateId, gate, artifacts, signatures);
  }

  private checkGateRequirements(id: string, gate: any, artifacts: string[], signatures: string[]): boolean {
    const missingArtifacts = gate.required_artifacts.filter((a: string) => !artifacts.includes(a));
    if (missingArtifacts.length > 0) {
      console.error(`[Gatekeeper] Gate ${id} blocked: Missing artifacts: ${missingArtifacts.join(', ')}`);
      return false;
    }

    const missingSignatures = gate.required_signatures.filter((s: string) => !signatures.includes(s));
    if (missingSignatures.length > 0) {
      console.error(`[Gatekeeper] Gate ${id} blocked: Missing signatures: ${missingSignatures.join(', ')}`);
      return false;
    }

    console.log(`[Gatekeeper] Gate ${id} verified successfully.`);
    return true;
  }

  public isHighImpactAIAuthorized(signatures: string[]): boolean {
    const mandatory = this.manifest.governance_controls.high_impact_ai.mandatory_signatures;
    const missing = mandatory.filter(s => !signatures.includes(s));
    if (missing.length > 0) {
      console.error(`[Gatekeeper] High-Impact AI blocked: Missing signatures: ${missing.join(', ')}`);
      return false;
    }
    return true;
  }
}
