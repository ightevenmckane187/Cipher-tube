import { resolveParams } from '../src/engine/runtime/orchestrator';

describe('resolveParams Security', () => {
  const config = {
    malicious: '${state.secret}',
    safe: 'normal'
  };
  const state = {
    secret: 'PRIVATE_KEY_123',
    nested: {
      data: 'value'
    }
  };
  const item = { id: 1 };

  it('should not allow double expansion (template injection)', () => {
    const input = 'Value: ${config.malicious}';
    const result = (resolveParams as any)(input, config, state, item);

    // If it's vulnerable, it will be 'Value: PRIVATE_KEY_123'
    // If it's secure, it should be 'Value: ${state.secret}'
    expect(result).toBe('Value: ${state.secret}');
  });

  it('should not allow access to __proto__', () => {
    const input = '${state.__proto__}';
    const result = (resolveParams as any)(input, config, state, item);

    expect(result).toBeUndefined();
  });

  it('should not allow access to constructor', () => {
    const input = '${state.constructor}';
    const result = (resolveParams as any)(input, config, state, item);

    expect(result).toBeUndefined();
  });

  it('should not allow access to prototype', () => {
    const input = '${state.prototype}';
    const result = (resolveParams as any)(input, config, state, item);

    expect(result).toBeUndefined();
  });

  it('should not allow deep prototype access', () => {
    const input = '${state.nested.constructor}';
    const result = (resolveParams as any)(input, config, state, item);

    expect(result).toBeUndefined();
  });

  it('should handle falsy values (0) correctly in direct match', () => {
    const customState = { zero: 0 };
    const result = (resolveParams as any)('${state.zero}', config, customState, item);
    expect(result).toBe(0);
  });

  it('should handle falsy values (false) correctly in direct match', () => {
    const customState = { flag: false };
    const result = (resolveParams as any)('${state.flag}', config, customState, item);
    expect(result).toBe(false);
  });

  it('should handle null correctly in direct match', () => {
    const customState = { nothing: null };
    const result = (resolveParams as any)('${state.nothing}', config, customState, item);
    expect(result).toBe(null);
  });

  it('should handle null item correctly', () => {
    const result = (resolveParams as any)('${item}', config, state, null);
    expect(result).toBe(null);
  });

  it('should stringify falsy values in interpolation', () => {
    const customState = { zero: 0 };
    const result = (resolveParams as any)('Value: ${state.zero}', config, customState, item);
    expect(result).toBe('Value: 0');
  });

  it('should correctly resolve items inside an array', () => {
    const input = ['${state.secret}', 'plain string', { nested: '${item.id}' }];
    const result = (resolveParams as any)(input, config, state, item);

    expect(result).toEqual(['PRIVATE_KEY_123', 'plain string', { nested: 1 }]);
  });
});
