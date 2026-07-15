import {
  executeWorkflow,
  executePipeline,
  ExecContext,
} from "../src/engine/runtime/orchestrator";

describe("Orchestrator Prototype Pollution Assignment", () => {
  const ctx: ExecContext = {
    actions: {
      test: {
        echo: async (params: any) => params,
      },
    },
    config: {},
  };

  afterEach(() => {
    delete (Object.prototype as any).polluted;
  });

  it("should prevent prototype pollution via workflow step output", async () => {
    const workflow = {
      name: "vulnerable-workflow",
      steps: [
        {
          action: "test.echo",
          params: "polluted",
          output: "__proto__",
        },
      ],
    };

    // Before fix, this will pollute Object.prototype
    await executeWorkflow(workflow, ctx);

    expect(({} as any).polluted).toBeUndefined();
  });

  it("should prevent prototype pollution via pipeline source name", async () => {
    const pipeline = {
      name: "vulnerable-pipeline-source",
      sources: [
        {
          name: "__proto__",
          use: "test.echo",
          params: "polluted",
        },
      ],
    };

    await executePipeline(pipeline, ctx);

    expect(({} as any).polluted).toBeUndefined();
  });

  it("should prevent prototype pollution via pipeline stage emit", async () => {
    const pipeline = {
      name: "vulnerable-pipeline-stage",
      stages: [
        {
          name: "test-stage",
          use: "test.echo",
          params: "polluted",
          emit: "__proto__",
        },
      ],
    };

    await executePipeline(pipeline, ctx);

    expect(({} as any).polluted).toBeUndefined();
  });

  it("should prevent prototype pollution via constructor and prototype keys", async () => {
    const workflow = {
      name: "vulnerable-workflow-constructor",
      steps: [
        {
          action: "test.echo",
          params: "polluted",
          output: "constructor",
        },
      ],
    };

    await executeWorkflow(workflow, ctx);
    expect((Object.prototype as any).polluted).toBeUndefined();
  });
});
