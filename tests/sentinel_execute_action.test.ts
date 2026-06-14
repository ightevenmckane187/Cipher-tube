import { executeWorkflow, ExecContext } from '../src/engine/runtime/orchestrator';

describe('Orchestrator Action Security', () => {
  it('should not allow execution of prototype methods as actions', async () => {
    const ctx: ExecContext = {
      actions: {}, // Empty actions, but has prototype!
      config: {}
    };

    const workflow = {
      name: 'Malicious Workflow',
      steps: [
        {
          action: '__proto__.toString',
          output: 'result'
        }
      ]
    };

    // Before fix, this might succeed if it finds toString on the prototype
    const state = await executeWorkflow(workflow, ctx);

    // It should not have been executed, or at least not returned [object Object] as a successful action result if we block it
    // If it's blocked, executeAction returns null, so state.result should be null or undefined
    expect(state.result).not.toBe('[object Object]');
  });

  it('should not allow actions with more than two segments', async () => {
     const ctx: ExecContext = {
      actions: {
          ns: {
              fn: () => 'ok'
          }
      },
      config: {}
    };

    const workflow = {
      name: 'Invalid Action',
      steps: [
        {
          action: 'ns.fn.extra',
          output: 'result'
        }
      ]
    };

    const state = await executeWorkflow(workflow, ctx);
    expect(state.result).toBeNull();
  });
});
