import { AuthorityChainValidator } from '../src/governance/m2522/validator';

describe('AuthorityChainValidator Enhancement', () => {
  const validManifestBase = {
    version: '1.0.0',
    framework: 'M-25-22',
    owner: 'test',
    roles: {
      saop: { name: 'SAOP', permissions: ['approve_privacy_review'] }
    },
    lifecycle_gates: {
      gate1: {
        sentinel_bindings: ['b1'],
        required_signatures: ['saop'],
        required_artifacts: ['a1']
      }
    },
    governance_controls: {
      high_impact_ai: {
        conditions: [],
        mandatory_signatures: ['saop'],
        mandatory_artifacts: []
      },
      vendor_lockin_prevention: {
        mandatory_artifacts: ['p1']
      }
    },
    escalation_paths: {
      path1: {
        trigger: 't1',
        notify: ['saop']
      }
    }
  };

  it('should throw if escalation_paths is malformed (not an object)', () => {
    const manifest = { ...validManifestBase, escalation_paths: 'not-an-object' };
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow('manifest.escalation_paths must be a non-array object');
  });

  it('should throw if an escalation path is missing trigger', () => {
    const manifest = JSON.parse(JSON.stringify(validManifestBase));
    delete manifest.escalation_paths.path1.trigger;
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow('Escalation path path1 is missing required field: trigger');
  });

  it('should throw if an escalation path notify is not an array', () => {
    const manifest = JSON.parse(JSON.stringify(validManifestBase));
    manifest.escalation_paths.path1.notify = 'not-an-array';
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow('Escalation path path1 notify must be an array');
  });

  it('should throw if vendor_lockin_prevention is missing', () => {
    const manifest = JSON.parse(JSON.stringify(validManifestBase));
    delete manifest.governance_controls.vendor_lockin_prevention;
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow('Missing or invalid governance_controls.vendor_lockin_prevention');
  });

  it('should throw if vendor_lockin_prevention.mandatory_artifacts is missing', () => {
    const manifest = JSON.parse(JSON.stringify(validManifestBase));
    delete manifest.governance_controls.vendor_lockin_prevention.mandatory_artifacts;
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow('governance_controls.vendor_lockin_prevention.mandatory_artifacts must be an array');
  });

  it('should throw if a role key is a prototype pollution key', () => {
    const manifest = JSON.parse(JSON.stringify(validManifestBase));
    Object.defineProperty(manifest.roles, '__proto__', {
        value: { name: 'Malicious', permissions: [] },
        enumerable: true,
        configurable: true
    });
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow('Invalid key in roles: __proto__');
  });

  it('should throw if a lifecycle gate key is a prototype pollution key', () => {
    const manifest = JSON.parse(JSON.stringify(validManifestBase));
    manifest.lifecycle_gates['constructor'] = {
        sentinel_bindings: [],
        required_signatures: ['saop'],
        required_artifacts: []
    };
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow('Invalid key in lifecycle_gates: constructor');
  });

  it('should throw if an escalation path key is a prototype pollution key', () => {
    const manifest = JSON.parse(JSON.stringify(validManifestBase));
    manifest.escalation_paths['prototype'] = {
        trigger: 't1',
        notify: []
    };
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow('Invalid key in escalation_paths: prototype');
  });
});
