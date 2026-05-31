import { resolveParams } from '../src/engine/runtime/orchestrator';

describe('Orchestrator Security', () => {
  it('should not allow double expansion (template injection)', () => {
    const config = {
      user_input: '${state.secret}',
    };
    const state = {
      secret: 'SENSITIVE_TOKEN',
    };

    const params = 'Value is: ${config.user_input}';
    const resolved = resolveParams(params, config, state, null);

    // If it's vulnerable, it will be "Value is: SENSITIVE_TOKEN"
    // If it's secure, it will be "Value is: ${state.secret}"
    expect(resolved).toBe('Value is: ${state.secret}');
  });

  it('should prevent prototype access', () => {
    const config = {};
    const state = {
      obj: {}
    };

    const params1 = '${state.obj.__proto__}';
    expect(resolveParams(params1, config, state, null)).toBeUndefined();

    const params2 = 'Proto is: ${state.obj.constructor}';
    expect(resolveParams(params2, config, state, null)).toBe('Proto is: ');
  });

  it('should handle direct item references correctly', () => {
    const item = { id: 123, name: 'Test' };
    expect(resolveParams('${item}', {}, {}, item)).toEqual(item);
    expect(resolveParams('ID: ${item.id}', {}, {}, item)).toBe('ID: 123');
  });

  it('should return original string if no $ is present (Bolt Optimization)', () => {
    const params = 'Just a normal string';
    expect(resolveParams(params, {}, {}, null)).toBe(params);
  });
});
