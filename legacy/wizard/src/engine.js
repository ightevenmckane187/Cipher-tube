"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardEngine = exports.logger = void 0;
const simple_git_1 = require("simple-git");
const pino_1 = __importDefault(require("pino"));
const security_js_1 = require("./modules/security.js");
const performance_js_1 = require("./modules/performance.js");
const ux_js_1 = require("./modules/ux.js");
const governance_js_1 = require("./modules/governance.js");
const security_js_2 = require("./repairs/security.js");
const performance_js_2 = require("./repairs/performance.js");
const resolve_conflicts_js_1 = require("./resolve-conflicts.js");
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info'
});
class WizardEngine {
    constructor() {
        this.git = (0, simple_git_1.simpleGit)();
        this.resolver = new resolve_conflicts_js_1.MergeResolver();
    }
    async analyze() {
        exports.logger.info('Starting Wizard Analysis...');
        const rootDir = process.cwd();
        const securityFindings = await (0, security_js_1.analyzeSecurity)(rootDir);
        const perfFindings = await (0, performance_js_1.analyzePerformance)(rootDir);
        const uxFindings = await (0, ux_js_1.analyzeUX)(rootDir);
        const govFindings = await (0, governance_js_1.analyzeGovernance)(rootDir);
        const findings = [
            ...securityFindings,
            ...perfFindings,
            ...uxFindings,
            ...govFindings
        ];
        const securityScore = Math.max(0, 100 - securityFindings.length * 20);
        const perfScore = Math.max(0, 100 - perfFindings.length * 15);
        const uxScore = Math.max(0, 100 - uxFindings.length * 10);
        const govScore = Math.max(0, 100 - govFindings.length * 25);
        const status = await this.git.status();
        const mergeScore = status.conflicted.length === 0 ? 100 : 0;
        const overallScore = Math.round((securityScore + perfScore + uxScore + govScore + mergeScore) / 5);
        return {
            score: overallScore,
            dimensions: {
                security: securityScore,
                performance: perfScore,
                ux: uxScore,
                governance: govScore,
                mergeHealth: mergeScore
            },
            findings
        };
    }
    async repair(report) {
        exports.logger.info('Starting Wizard Repair...');
        for (const finding of report.findings) {
            if (!finding.autoFixable)
                continue;
            exports.logger.info(`Applying repair for ${finding.id}: ${finding.message}`);
            try {
                switch (finding.pillar) {
                    case 'security':
                        await (0, security_js_2.repairSecurity)(finding);
                        break;
                    case 'performance':
                        await (0, performance_js_2.repairPerformance)(finding);
                        break;
                    // Add others as needed
                }
            }
            catch (err) {
                exports.logger.error(`Failed to repair ${finding.id}: ${err}`);
            }
        }
        // After repairs, check if we need to commit
        const status = await this.git.status();
        if (status.modified.length > 0) {
            const isRisky = status.modified.length > 3 || status.modified.some(f => f.includes('governance/') || f.includes('crypto/'));
            if (isRisky) {
                const branchName = `wizard-fix/${Math.random().toString(36).substring(7)}`;
                exports.logger.info(`Risky changes detected, moving to separate branch: ${branchName}`);
                await this.git.checkout(['-b', branchName]);
                await this.git.add('.');
                await this.git.commit('🧙‍♂️ Wizard: Applied complex repairs (risky)');
                // In real CI we would push and open a PR
            }
            else {
                exports.logger.info('Safe changes detected, committing directly...');
                await this.git.add('.');
                await this.git.commit('🧙‍♂️ Wizard: Auto-applied security and performance repairs');
            }
        }
    }
}
exports.WizardEngine = WizardEngine;
//# sourceMappingURL=engine.js.map