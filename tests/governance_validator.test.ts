import { AuthorityChainValidator } from '../src/governance/m2522/validator';

describe('AuthorityChainValidator', () => {
  const validManifest = {
    version: '1.0.0',
    framework: 'M-25-22',
    owner: 'jesse',
    roles: {
      admin: { name: 'Admin', permissions: ['all'] }
    },
    lifecycle_gates: {
      start: {
        sentinel_bindings: [],
        required_signatures: ['admin'],
        required_artifacts: []
      }
    },
    governance_controls: {
      high_impact_ai: {
        conditions: [],
        mandatory_signatures: ['admin'],
        mandatory_artifacts: []
      }
    },
    escalation_paths: {}
  };

  it('should validate a correct manifest', () => {
    expect(AuthorityChainValidator.validate(validManifest)).toBe(true);
  });

  it('should throw if roles is not an object', () => {
    const invalid = { ...validManifest, roles: [] };
    expect(() => AuthorityChainValidator.validate(invalid)).toThrow('manifest.roles must be a non-array object');
  });

  it('should throw if lifecycle_gates is not an object', () => {
    const invalid = { ...validManifest, lifecycle_gates: 'invalid' };
    expect(() => AuthorityChainValidator.validate(invalid)).toThrow('manifest.lifecycle_gates must be a non-array object');
  });

  it('should throw if mandatory_signatures is not an array', () => {
    const invalid = JSON.parse(JSON.stringify(validManifest));
    invalid.governance_controls.high_impact_ai.mandatory_signatures = {};
    expect(() => AuthorityChainValidator.validate(invalid)).toThrow('governance_controls.high_impact_ai.mandatory_signatures must be an array');
  });

  it('should throw if a role references non-existent role in signatures', () => {
    const invalid = JSON.parse(JSON.stringify(validManifest));
    invalid.lifecycle_gates.start.required_signatures = ['non-existent'];
    expect(() => AuthorityChainValidator.validate(invalid)).toThrow('Lifecycle gate start references non-existent role: non-existent');
  });
});
