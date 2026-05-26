export async function shard(params: any) {
  console.log(`[Asset] Sharding assets with strategy: ${params.strategy}`);
  return [{ id: "shard-1" }, { id: "shard-2" }];
}

export async function list(params: any) {
  console.log(`[Asset] Listing assets with scope: ${params.scope}`);
  return { count: 100, items: [] };
}
