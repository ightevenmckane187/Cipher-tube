import { ComplianceGatekeeper } from '../src/governance/gatekeeper';

describe('ComplianceGatekeeper', () => {
  let gatekeeper: ComplianceGatekeeper;

  beforeEach(() => {
    gatekeeper = new ComplianceGatekeeper();
  });

  it('should verify a valid gate', () => {
    const artifacts = ['requirements_canvas'];
    const signatures = ['program_manager'];
    const result = gatekeeper.verifyGate('requirements_identification', artifacts, signatures);
    expect(result).toBe(true);
  });

  it('should fail if artifacts are missing', () => {
    const artifacts: string[] = [];
    const signatures = ['program_manager'];
    const result = gatekeeper.verifyGate('requirements_identification', artifacts, signatures);
    expect(result).toBe(false);
  });

  it('should fail if signatures are missing', () => {
    const artifacts = ['requirements_canvas'];
    const signatures: string[] = [];
    const result = gatekeeper.verifyGate('requirements_identification', artifacts, signatures);
    expect(result).toBe(false);
  });

  it('should authorize high-impact AI with correct signatures', () => {
    const signatures = ['saop', 'ciso', 'civil_rights_officer'];
    const result = gatekeeper.isHighImpactAIAuthorized(signatures);
    expect(result).toBe(true);
  });

  it('should deny high-impact AI if signature is missing', () => {
    const signatures = ['saop', 'ciso'];
    const result = gatekeeper.isHighImpactAIAuthorized(signatures);
    expect(result).toBe(false);
  });

  it('should reject prototype-based gate IDs', () => {
    const result = gatekeeper.verifyGate('toString', [], []);
    expect(result).toBe(false);
  });
});
