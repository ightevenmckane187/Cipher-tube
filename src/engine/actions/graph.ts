export async function collect(params: any) {
  console.log(
    `[Graph] Collecting inputs from sources: ${params.sources?.join(", ")}`,
  );
  return { data: [] };
}

export async function build(params: any) {
  console.log(`[Graph] Building graph in mode: ${params.mode}`);
  return { id: "graph-123", edges: 0 };
}

export async function find_paths(params: any) {
  console.log(
    `[Graph] Finding paths with criteria: ${JSON.stringify(params.criteria || params.where)}`,
  );
  return [];
}

export async function rebuildandconfirmnopaths(params: any) {
  console.log(`[Graph] Verifying environment is clean`);
  return true;
}
