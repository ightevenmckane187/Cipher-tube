import crypto from "crypto";

export async function invokeAsync(workflowName: string, params: any) {
  console.log(
    `[Async] Enqueuing workflow: ${workflowName} with params: ${JSON.stringify(params)}`,
  );
  // Mock async execution
  return { jobId: crypto.randomBytes(8).toString("hex") };
}

export function registerWorker(workflowName: string, handler: Function) {
  console.log(`[Async] Registered worker for: ${workflowName}`);
}

// Action stub for workflow.invoke_async
export async function workflow_invoke_async(params: any) {
  const name = Array.isArray(params) ? params[0] : params.name;
  const p = Array.isArray(params) ? params[1] : params.params;
  return await invokeAsync(name, p);
}
