import { WizardEngine, logger } from "./engine.js";
import { generateMarkdownReport } from "./reporter.js";

async function main() {
  const engine = new WizardEngine();
  const report = await engine.analyze();

  const markdown = generateMarkdownReport(report);
  console.log(markdown);

  if (process.argv.includes("--fix")) {
    await engine.repair(report);
  }

  if (process.argv.includes("--json")) {
    process.stdout.write(JSON.stringify(report, null, 2));
  }
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
