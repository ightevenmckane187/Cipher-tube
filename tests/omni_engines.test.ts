import {
  executeWorkflow,
  ExecContext,
} from "../src/engine/runtime/orchestrator";
import { omniEngines } from "../src/engine/runtime/omni_engines";

describe("OmniSpiral Engine Matrix", () => {
  const ctx: ExecContext = {
    actions: {
      ...omniEngines,
    },
    config: {
      default_layer: "baseline",
    },
  };

  it("should execute MPE mutation", async () => {
    const workflow = {
      name: "mpe_test",
      steps: [
        {
          action: "mp.mutate",
          params: { constants: { entropy: 0.1 } },
          output: "mpe_result",
        },
      ],
    };

    const state = await executeWorkflow(workflow, ctx);
    expect(state.mpe_result.status).toBe("mutated");
    expect(state.mpe_result.constants.entropy).toBe(0.1);
  });

  it("should execute Paradox synthesis and identify ascension", async () => {
    const workflow = {
      name: "paradox_test",
      steps: [
        {
          action: "paradox.synthesize",
          params: { ratio: 1.5 },
          output: "paradox_result",
        },
      ],
    };

    const state = await executeWorkflow(workflow, ctx);
    expect(state.paradox_result.status).toBe("synthesized");
    expect(state.paradox_result.rp).toBe(1.5);
    expect(state.paradox_result.ascend).toBe(true);
  });

  it("should resolve template variables across engines", async () => {
    const workflow = {
      name: "multi_engine_test",
      steps: [
        {
          action: "mp.mutate",
          params: { constants: { entropy: 0.5 } },
          output: "mpe",
        },
        {
          action: "paradox.synthesize",
          params: { ratio: "${state.mpe.constants.entropy}" },
          output: "paradox",
        },
      ],
    };

    const state = await executeWorkflow(workflow, ctx);
    expect(state.paradox.rp).toBe(0.5);
  });
});
