import { resolveParams } from '../src/engine/runtime/orchestrator';

describe('resolveParams Prototype Pollution Protection', () => {
  const config = {};
  const state = {};
  const item = {};

  it('should skip sensitive keys during object iteration', () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": "yes"}, "safe": "value"}');

    // reset global prototype just in case
    delete (Object.prototype as any).polluted;

    const resolved = resolveParams(malicious, config, state, item);

    expect(resolved).toEqual({ safe: "value" });
    expect(resolved.__proto__).toBe(Object.prototype);
    expect((resolved as any).polluted).toBeUndefined();
    expect(({} as any).polluted).toBeUndefined();
  });

  it('should skip constructor and prototype keys', () => {
    const malicious = {
      constructor: { polluted: 'yes' },
      prototype: { polluted: 'yes' },
      normal: 'data'
    };

    const resolved = resolveParams(malicious, config, state, item);
    expect(resolved).toEqual({ normal: 'data' });
  });

  it('should protect nested objects', () => {
    const malicious = {
      nested: JSON.parse('{"__proto__": {"polluted": "yes"}}')
    };

    const resolved = resolveParams(malicious, config, state, item);
    expect(resolved.nested).toEqual({});
    expect(({} as any).polluted).toBeUndefined();
  });
});
