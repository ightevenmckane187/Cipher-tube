"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_js_1 = require("./engine.js");
const reporter_js_1 = require("./reporter.js");
async function main() {
    const engine = new engine_js_1.WizardEngine();
    const report = await engine.analyze();
    const markdown = (0, reporter_js_1.generateMarkdownReport)(report);
    console.log(markdown);
    if (process.argv.includes('--fix')) {
        await engine.repair(report);
    }
    if (process.argv.includes('--json')) {
        process.stdout.write(JSON.stringify(report, null, 2));
    }
}
main().catch(err => {
    engine_js_1.logger.error(err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map