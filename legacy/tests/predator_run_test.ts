import { PredatorOrchestrator } from '../src/os/orchestrator/predatorOrchestrator';

async function main() {
  const orchestrator = new PredatorOrchestrator();

  console.log("--- Testing Predator Control-Graph Pipeline ---");
  try {
    await orchestrator.runPipeline("predatorcontrolgraph_engine");
    console.log("Pipeline test successful!");
  } catch (err) {
    console.error("Pipeline test failed:", err);
  }

  console.log("\n--- Testing Predator Large Scale Workflow ---");
  try {
    await orchestrator.runWorkflow("predatorcontrolgraphenginelarge");
    console.log("Large Scale Workflow test successful!");
  } catch (err) {
    console.error("Large Scale Workflow test failed:", err);
  }

  console.log("\n--- Testing Federal Predator Autopilot ---");
  try {
    await orchestrator.runWorkflow("federalpredatorautopilot");
    console.log("Autopilot test successful!");
  } catch (err) {
    console.error("Autopilot test failed:", err);
  }
}

main();
