import { AuthorityChainValidator } from '../src/governance/m2522/validator';

describe('Authority Chain Validator Robustness', () => {
  it('should not crash when roles is null', () => {
    const invalidManifest = {
      version: '1.0.0',
      framework: 'M-25-22',
      owner: 'test',
      roles: null, // Should be an object
      lifecycle_gates: {},
      governance_controls: {
        high_impact_ai: {
          mandatory_signatures: []
        }
      },
      escalation_paths: {}
    };
    // Currently this might throw TypeError: Cannot convert undefined or null to object
    expect(() => AuthorityChainValidator.validate(invalidManifest)).toThrow('roles must be an object');
  });

  it('should not crash when lifecycle_gates is null', () => {
    const invalidManifest = {
      version: '1.0.0',
      framework: 'M-25-22',
      owner: 'test',
      roles: {},
      lifecycle_gates: null, // Should be an object
      governance_controls: {
        high_impact_ai: {
          mandatory_signatures: []
        }
      },
      escalation_paths: {}
    };
    expect(() => AuthorityChainValidator.validate(invalidManifest)).toThrow('lifecycle_gates must be an object');
  });

  it('should not crash when mandatory_signatures is not an array', () => {
    const invalidManifest = {
      version: '1.0.0',
      framework: 'M-25-22',
      owner: 'test',
      roles: {},
      lifecycle_gates: {},
      governance_controls: {
        high_impact_ai: {
          mandatory_signatures: null // Should be an array
        }
      },
      escalation_paths: {}
    };
    expect(() => AuthorityChainValidator.validate(invalidManifest)).toThrow('mandatory_signatures must be an array');
  });
});
