export interface ExecContext {
  actions: Record<string, Record<string, Function>>;
  config: Record<string, any>;
  registry?: Record<string, any>;
}

export async function executeWorkflow(def: any, ctx: ExecContext, params: Record<string, any> = {}) {
  const state: Record<string, any> = { params };
  console.log(`Executing Workflow: ${def.name}`);

  for (const step of def.steps ?? []) {
    if (step.foreach) {
      const items = resolveParams(state[step.foreach] || `\${state.${step.foreach}}`, ctx.config, state, null);
      if (Array.isArray(items)) {
          for (const item of items) {
            await executeAction(step.action, step, state, ctx, item);
          }
      }
    } else {
      const result = await executeAction(step.action, step, state, ctx);
      if (step.output) state[step.output] = result;
    }
  }

  return state;
}

export async function executePipeline(def: any, ctx: ExecContext) {
  const state: Record<string, any> = {};
  console.log(`Executing Pipeline: ${def.name}`);

  // Process sources
  for (const source of def.sources ?? []) {
    const result = await executeAction(source.use, source, state, ctx);
    state[source.name] = result;
  }

  // Process stages
  for (const stage of def.stages ?? []) {
    if (stage.parallel) {
       console.log(`Executing Stage Parallel: ${stage.name}`);
       const branchPromises = Object.entries(stage.branches || {}).map(async ([name, branch]: [string, any]) => {
         // Pass input data from 'from' if specified
         const branchInput = stage.from ? resolveParams(Array.isArray(stage.from) ? `\${state.${stage.from[0]}}` : `\${state.${stage.from}}`, ctx.config, state, null) : null;
         return executeAction(branch.use, { ...branch, input: branchInput }, state, ctx);
       });
       await Promise.all(branchPromises);
    } else {
      // Basic support for 'from' - pass it as 'input' to the handler
      let input = null;
      if (stage.from) {
          if (Array.isArray(stage.from)) {
              input = stage.from.map((f: string) => state[f]);
          } else {
              input = state[stage.from];
          }
      }

      const result = await executeAction(stage.use, { ...stage, input }, state, ctx);
      if (stage.emit) state[stage.emit] = result;
    }
  }

  // Process sinks
  for (const sink of def.sinks ?? []) {
    let input = null;
    if (sink.from) {
        if (Array.isArray(sink.from)) {
            input = sink.from.map((f: string) => state[f]);
        } else {
            input = state[sink.from];
        }
    }
    await executeAction(sink.use, { ...sink, input }, state, ctx);
  }

  return state;
}

async function executeAction(actionStr: string, step: any, state: Record<string, any>, ctx: ExecContext, item: any = null) {
  if (actionStr === "workflow.invoke") {
    const workflowName = step.params?.[0] || step.action?.split('(')[1]?.split(')')[0].replace(/'|"/g, '');
    console.log(`Invoking internal workflow: ${workflowName}`);
    return { invoked: workflowName };
  }

  const [ns, fn] = actionStr.split('.');
  const handler = ctx.actions[ns]?.[fn];

  if (!handler) {
    console.warn(`Unknown action: ${actionStr}`);
    return null;
  }

  const params = step.params || step;
  const resolvedParams = resolveParams(params, ctx.config, state, item);

  return await handler(resolvedParams, state, ctx.config);
}

/**
 * Resolves a deep path in a root object with prototype protection.
 */
function resolvePath(root: any, path: string | undefined): any {
    if (!root) return root;
    if (!path) return root;

    const keys = path.split('.');
    let val = root;
    for (const k of keys) {
        // Sentinel: Block access to prototype properties
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
            return undefined;
        }
        val = val?.[k];
    }
    return val;
}

/**
 * Resolves template strings in params using config, state, and item context.
 * Sentinel: Implements single-pass replacement to prevent template injection (double expansion).
 * Sentinel: Blocks access to sensitive prototype properties to prevent prototype pollution/access.
 * Bolt: Includes short-circuit for static strings to optimize performance.
 */
export function resolveParams(params: any, config: any, state: any, item: any): any {
  if (typeof params === 'string') {
    // Bolt Optimization: Short-circuit for static strings
    if (!params.includes('$')) return params;

    // Check if it's a direct reference like "${state.xxx}"
    const directMatch = params.match(/^\${(config|state|params|item)(?:\.([^}]+))?}$/);
    if (directMatch) {
        const [, type, key] = directMatch;
        let root;
        if (type === 'config') root = config;
        else if (type === 'state') root = state;
        else if (type === 'params') root = state.params;
        else if (type === 'item') root = item;

        return resolvePath(root, key);
    }

    // Sentinel: Single-pass regex replacement to prevent double expansion/template injection
    return params.replace(/\${(config|state|params|item)(?:\.([^}]+))?}/g, (match, type, key) => {
        let root;
        if (type === 'config') root = config;
        else if (type === 'state') root = state;
        else if (type === 'params') root = state.params;
        else if (type === 'item') root = item;

        const val = resolvePath(root, key);

        // Handle cases where the path doesn't exist or is invalid
        if (val === undefined) {
             // If the root exists but the key doesn't, return 'undefined' string
             if (root !== undefined) return 'undefined';
             // If even the root is missing, return the original match
             return match;
        }

        return String(val);
    });
  }

  if (Array.isArray(params)) {
    return params.map(p => resolveParams(p, config, state, item));
  }

  if (params && typeof params === 'object') {
    const resolved: any = {};
    for (const [k, v] of Object.entries(params)) {
      resolved[k] = resolveParams(v, config, state, item);
    }
    return resolved;
  }

  return params;
}
