import { executeWorkflow, ExecContext } from '../src/engine/runtime/orchestrator';

describe('Action Injection Vulnerability', () => {
  it('should not allow executing prototype methods as actions', async () => {
    const ctx: ExecContext = {
      actions: {
        math: {
          add: (p: any) => p.a + p.b,
        },
      },
      config: {},
    };

    const workflow = {
      name: 'Vulnerable Workflow',
      steps: [
        {
          action: 'math.toString', // Prototype method on math namespace
          output: 'result',
        },
      ],
    };

    // If vulnerable, it might return [object Object] or something similar because toString exists on the prototype
    const state = await executeWorkflow(workflow, ctx);

    // If it's vulnerable, it will find 'toString' and execute it (or fail if it expects a handler signature)
    // In our case, handler(resolvedParams, state, ctx.config)
    // math.toString() will return "[object Object]"

    // We expect it to be null if it's correctly blocked or not found as an OWN property
    expect(state.result).not.toBe('[object Object]');
    expect(state.result).toBe(null); // executeAction returns null on failure
  });

  it('should not allow accessing prototype methods on ctx.actions', async () => {
    const ctx: ExecContext = {
      actions: {
        math: {
          add: (p: any) => p.a + p.b,
        },
      },
      config: {},
    };

    const workflow = {
      name: 'Vulnerable Workflow 2',
      steps: [
        {
          action: 'hasOwnProperty.toString', // hasOwnProperty is on Object.prototype
          output: 'result',
        },
      ],
    };

    const state = await executeWorkflow(workflow, ctx);
    expect(state.result).toBe(null);
  });
});
