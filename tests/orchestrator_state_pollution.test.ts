import {
  executeWorkflow,
  executePipeline,
  ExecContext,
} from "../src/engine/runtime/orchestrator";

describe("Orchestrator State Pollution Reproduction", () => {
  const ctx: ExecContext = {
    actions: {
      test: {
        malicious: async () => ({ polluted: "yes" }),
        echo: async (params: any) => params,
      },
    },
    config: {},
  };

  beforeEach(() => {
    // Clean up potential pollution from Object.prototype
    delete (Object.prototype as any).polluted;
  });

  afterEach(() => {
    delete (Object.prototype as any).polluted;
  });

  it("should demonstrate prototype pollution via workflow step output", async () => {
    const workflow = {
      name: "pollution-workflow",
      steps: [
        {
          action: "test.malicious",
          output: "__proto__",
        },
      ],
    };

    const state = await executeWorkflow(workflow, ctx);

    // Should NOT be polluted
    expect((state as any).polluted).toBeUndefined();
  });

  it("should demonstrate prototype pollution via pipeline source name", async () => {
    const pipeline = {
      name: "pollution-pipeline",
      sources: [
        {
          name: "__proto__",
          use: "test.malicious",
        },
      ],
    };

    const state = await executePipeline(pipeline, ctx);

    expect((state as any).polluted).toBeUndefined();
  });

  it("should demonstrate prototype pollution via pipeline stage emit", async () => {
    const pipeline = {
      name: "pollution-pipeline-emit",
      stages: [
        {
          name: "stage1",
          use: "test.malicious",
          emit: "__proto__",
        },
      ],
    };

    const state = await executePipeline(pipeline, ctx);

    expect((state as any).polluted).toBeUndefined();
  });
});
