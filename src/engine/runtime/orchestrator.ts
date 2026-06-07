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
 * Sentinel: Centralized validator for state keys to prevent prototype pollution.
 */
function isValidStateKey(key: string): boolean {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

/**
 * Sentinel: Secure path resolution helper to prevent prototype pollution.
 */
function resolvePath(root: any, path: string | undefined): any {
  if (!root) return undefined;
  if (!path) return root;

  // Bolt Optimization: Short-circuit for single-level paths to avoid split('.') and array allocation.
  if (!path.includes('.')) {
    return isValidStateKey(path) ? root[path] : undefined;
  }

  const keys = path.split('.');
  let current = root;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    // Sentinel: Block access to internal properties that could be used for prototype pollution
    if (!isValidStateKey(key)) {
      return undefined;
    }
    current = current?.[key];
  }

  return current;
}

/**
 * Sentinel: Resolves template variables in a single pass to prevent template injection (double expansion).
 */
export function resolveParams(params: any, config: any, state: any, item: any): any {
  if (typeof params === 'string') {
    // Bolt Optimization: Short-circuit for static strings
    if (!params.includes('$')) return params;

    // Bolt Optimization: Fast check for direct matches to avoid regex overhead on non-matching strings.
    if (params.startsWith('${') && params.endsWith('}')) {
      const directMatch = params.match(/^\${(config|state|params|item)(?:\.([^}]+))?}$/);
      if (directMatch) {
          const [, type, path] = directMatch;

          // Bolt Optimization: Use direct root selection instead of ternary chain or helper.
          let root;
          if (type === 'state') root = state;
          else if (type === 'config') root = config;
          else if (type === 'params') root = state?.params;
          else if (type === 'item') root = item;

          return resolvePath(root, path);
      }
    }

    // Sentinel: Mixed string interpolation using a single-pass regex to avoid template injection.
    // This ensures that values containing template syntax are NOT recursively expanded.
    return params.replace(/\${(config|state|params|item)(?:\.([^}]+))?}/g, (_, type, path) => {
        let root;
        if (type === 'state') root = state;
        else if (type === 'config') root = config;
        else if (type === 'params') root = state?.params;
        else if (type === 'item') root = item;

        const val = resolvePath(root, path);
        // Handle falsy values (0, false, null) correctly during string interpolation
        return (val !== undefined && val !== null) ? String(val) : '';
    });
  }

  if (Array.isArray(params)) {
    const len = params.length;
    const resolved = new Array(len);
    for (let i = 0; i < len; i++) {
        resolved[i] = resolveParams(params[i], config, state, item);
    }
    return resolved;
  }

  if (params && typeof params === 'object') {
    const resolved: any = {};
    const keys = Object.keys(params);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      // Sentinel: Block prototype pollution during object iteration
      if (!isValidStateKey(k)) {
        continue;
      }
      resolved[k] = resolveParams(params[k], config, state, item);
    }
    return resolved;
  }

  return params;
}
