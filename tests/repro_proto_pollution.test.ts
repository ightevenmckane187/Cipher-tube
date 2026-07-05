import {
  executeWorkflow,
  executePipeline,
  ExecContext,
} from "../src/engine/runtime/orchestrator";

describe("Orchestrator State Assignment Prototype Pollution PROTECTION", () => {
  let ctx: ExecContext;

  beforeEach(() => {
    ctx = {
      actions: {
        test: {
          getMalicious: async () => ({ isAdmin: true }),
          check: async (params: any) => {
            /* will be shadowed in tests */
          },
        },
      },
      config: {},
    };
  });

  it("should prevent logic bypass via local state prototype pollution in executeWorkflow", async () => {
    let capturedAdminValue: any = null;
    ctx.actions.test.check = async (params: any) => {
      capturedAdminValue = params.admin;
    };

    const workflow = {
      name: "Bypass Workflow",
      steps: [
        {
          action: "test.getMalicious",
          output: "__proto__",
        },
        {
          action: "test.check",
          params: {
            admin: "${state.isAdmin}",
          },
        },
      ],
    };

    await executeWorkflow(workflow, ctx);

    // PROTECTION: This should be undefined because __proto__ assignment should be blocked
    expect(capturedAdminValue).toBeUndefined();
  });

  it("should prevent logic bypass via local state prototype pollution in executePipeline", async () => {
    const pipeline = {
      name: "Bypass Pipeline",
      sources: [
        {
          use: "test.getMalicious",
          name: "__proto__",
        },
      ],
      stages: [
        {
          use: "test.check",
          params: {
            admin: "${state.isAdmin}",
          },
        },
      ],
    };

    let capturedAdminValue: any = null;
    ctx.actions.test.check = async (params: any) => {
      capturedAdminValue = params.admin;
    };

    await executePipeline(pipeline, ctx);

    expect(capturedAdminValue).toBeUndefined();
  });

  it("should prevent logic bypass via local state prototype pollution in executePipeline stage emit", async () => {
    const pipeline = {
      name: "Bypass Pipeline",
      stages: [
        {
          use: "test.getMalicious",
          emit: "__proto__",
        },
        {
          use: "test.check",
          params: {
            admin: "${state.isAdmin}",
          },
        },
      ],
    };

    let capturedAdminValue: any = null;
    ctx.actions.test.check = async (params: any) => {
      capturedAdminValue = params.admin;
    };

    await executePipeline(pipeline, ctx);

    expect(capturedAdminValue).toBeUndefined();
  });
});
