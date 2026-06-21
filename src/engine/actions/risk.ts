export async function score(params: any) {
  console.log(`[Risk] Scoring items with model: ${params.model}`);
  return params.items || [];
}

export async function scoreandremediate(params: any) {
  console.log(`[Risk] Scoring and remediating paths`);
  return { success: true };
}
