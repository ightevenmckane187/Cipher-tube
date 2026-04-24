import { AuthorityChainLoader } from '../src/governance/m2522/loader';
import { AuthorityChainValidator } from '../src/governance/m2522/validator';

describe('Authority Chain Manifest', () => {
  it('should load the manifest successfully', () => {
    const manifest = AuthorityChainLoader.load();
    expect(manifest).toBeDefined();
    expect(manifest.framework).toBe('M-25-22');
  });

  it('should have the required roles defined', () => {
    const manifest = AuthorityChainLoader.load();
    expect(manifest.roles).toHaveProperty('saop');
    expect(manifest.roles).toHaveProperty('ciso');
    expect(manifest.roles).toHaveProperty('civil_rights_officer');
  });

  it('should have the required lifecycle gates', () => {
    const manifest = AuthorityChainLoader.load();
    expect(manifest.lifecycle_gates).toHaveProperty('requirements_identification');
    expect(manifest.lifecycle_gates).toHaveProperty('contract_administration');
  });

  it('should validate high-impact AI mandatory signatures', () => {
    const manifest = AuthorityChainLoader.load();
    const signatures = manifest.governance_controls.high_impact_ai.mandatory_signatures;
    expect(signatures).toContain('saop');
    expect(signatures).toContain('ciso');
    expect(signatures).toContain('civil_rights_officer');
  });

  it('should throw error for invalid manifest', () => {
    const invalidManifest = { version: '1.0.0' };
    expect(() => AuthorityChainValidator.validate(invalidManifest)).toThrow();
  });

  it('should throw error if role in lifecycle gate does not exist', () => {
    const invalidManifest = {
      version: '1.0.0',
      framework: 'M-25-22',
      owner: 'test',
      roles: {
        admin: { name: 'Admin', permissions: [] }
      },
      lifecycle_gates: {
        gate1: {
          sentinel_bindings: [],
          required_signatures: ['non_existent_role'],
          required_artifacts: []
        }
      },
      governance_controls: {
        high_impact_ai: {
          conditions: [],
          mandatory_signatures: ['admin'],
          mandatory_artifacts: []
        },
        vendor_lockin_prevention: {
          mandatory_artifacts: []
        }
      },
      escalation_paths: {}
    };
    expect(() => AuthorityChainValidator.validate(invalidManifest)).toThrow(/references non-existent role/);
  });
});
