import { executeWorkflow, ExecContext } from '../src/engine/runtime/orchestrator';

describe('Action Injection Protection', () => {
  it('should not allow executing prototype methods as actions', async () => {
    const ctx: ExecContext = {
      actions: {
        safe: {
          run: () => 'safe'
        }
      },
      config: {}
    };

    const workflow = {
      name: 'vulnerable-workflow',
      steps: [
        {
          action: 'toString.call', // Exploits prototype chain
          output: 'result'
        }
      ]
    };

    const state = await executeWorkflow(workflow, ctx);

    // Handler should be null because the action is blocked or not found.
    expect(state.result).toBeNull();
  });

  it('should not allow access to __proto__ namespace', async () => {
      const ctx: ExecContext = {
          actions: {
              safe: { run: () => 'safe' }
          },
          config: {}
      };

      const workflow = {
          name: 'proto-workflow',
          steps: [
              {
                  action: '__proto__.toString',
                  output: 'result'
              }
          ]
      };

      const state = await executeWorkflow(workflow, ctx);
      expect(state.result).toBeNull();
  });

  it('should not allow malformed action strings', async () => {
    const ctx: ExecContext = {
        actions: {
            safe: { run: () => 'safe' }
        },
        config: {}
    };

    const workflow = {
        name: 'malformed-workflow',
        steps: [
            {
                action: 'safe.run.extra', // Too many segments
                output: 'result'
            },
            {
                action: 'onlyone', // Too few segments
                output: 'result2'
            }
        ]
    };

    const state = await executeWorkflow(workflow, ctx);
    expect(state.result).toBeNull();
    expect(state.result2).toBeNull();
  });
});
