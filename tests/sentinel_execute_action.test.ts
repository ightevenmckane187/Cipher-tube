import { executeWorkflow } from '../src/engine/runtime/orchestrator';

describe('executeAction Security', () => {
  it('should not allow execution of prototype methods', async () => {
    const ctx: any = {
      actions: {},
      config: {}
    };
    const def = {
      name: 'Malicious Workflow',
      steps: [
        {
          action: 'constructor.toString',
          output: 'result'
        }
      ]
    };

    // This should not crash and should not execute Object.toString
    // It should probably warn and return null
    const state = await executeWorkflow(def, ctx);
    expect(state.result).toBeNull();
  });

  it('should only allow ns.fn format', async () => {
      const ctx: any = {
        actions: {
            ns: {
                fn: () => 'success'
            }
        },
        config: {}
      };

      const def1 = {
        name: 'Valid Workflow',
        steps: [{ action: 'ns.fn', output: 'res' }]
      };
      const state1 = await executeWorkflow(def1, ctx);
      expect(state1.res).toBe('success');

      const def2 = {
        name: 'Invalid Workflow',
        steps: [{ action: 'ns.fn.extra', output: 'res' }]
      };
      const state2 = await executeWorkflow(def2, ctx);
      expect(state2.res).toBeNull();
  });
});
