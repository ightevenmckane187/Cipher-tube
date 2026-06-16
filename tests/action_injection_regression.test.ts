import { executeWorkflow, ExecContext } from '../src/engine/runtime/orchestrator';

describe('Orchestrator Action Injection Regression', () => {
  it('should not allow execution of prototype methods as actions (RCE attempt via constructor)', async () => {
    const ctx: ExecContext = {
      actions: {},
      config: {}
    };

    const workflow = {
      name: 'Injection Test',
      steps: [
        {
          action: 'toString.constructor',
          params: 'return "RCE"',
          output: 'result'
        }
      ]
    };

    const state = await executeWorkflow(workflow, ctx);
    // Should be null because 'toString' is not an own property of ctx.actions
    expect(state.result).toBeNull();
  });

  it('should not allow direct access to ctx.actions prototype (hasOwnProperty.call)', async () => {
     const ctx: ExecContext = {
      actions: {},
      config: {}
    };

    const workflow = {
      name: 'Injection Test',
      steps: [
        {
          action: 'hasOwnProperty.call',
          params: [{}, 'a'],
          output: 'result'
        }
      ]
    };

    const state = await executeWorkflow(workflow, ctx);
    expect(state.result).toBeNull();
  });

  it('should not allow invalid action formats', async () => {
     const ctx: ExecContext = {
      actions: {
        ns: {
          fn: () => 'success'
        }
      },
      config: {}
    };

    const workflow = {
      name: 'Invalid Format Test',
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
