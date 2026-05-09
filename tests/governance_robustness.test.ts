import { AuthorityChainValidator } from '../src/governance/m2522/validator';

describe('AuthorityChainValidator Robustness', () => {
  const validManifestBase = {
    version: '1.0.0',
    framework: 'M-25-22',
    owner: 'Sentinel',
    roles: {},
    lifecycle_gates: {},
    governance_controls: {
      high_impact_ai: {
        conditions: [],
        mandatory_signatures: [],
        mandatory_artifacts: []
      },
      vendor_lockin_prevention: {
        mandatory_artifacts: []
      }
    },
    escalation_paths: {}
  };

  it('should throw error if roles is an array', () => {
    const manifest = { ...validManifestBase, roles: [] };
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow('manifest.roles must be a non-array object');
  });

  it('should throw error if lifecycle_gates is null', () => {
    const manifest = { ...validManifestBase, lifecycle_gates: null };
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow('manifest.lifecycle_gates must be a non-array object');
  });

  it('should throw error if required_signatures is not an array', () => {
    const manifest = {
      ...validManifestBase,
      lifecycle_gates: {
        gate1: {
          sentinel_bindings: [],
          required_signatures: 'not-an-array',
          required_artifacts: []
        }
      }
    };
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow('Lifecycle gate gate1 required_signatures must be an array');
  });

  it('should throw error if mandatory_signatures is null', () => {
    const manifest = JSON.parse(JSON.stringify(validManifestBase));
    manifest.governance_controls.high_impact_ai.mandatory_signatures = null;
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow('governance_controls.high_impact_ai.mandatory_signatures must be an array');
  });

  it('should pass for a valid empty manifest', () => {
    expect(AuthorityChainValidator.validate(validManifestBase)).toBe(true);
  });
});
