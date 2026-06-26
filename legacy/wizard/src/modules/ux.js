"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeUX = analyzeUX;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function analyzeUX(rootDir) {
    const findings = [];
    // 1. Check for interactive elements without ARIA labels or keyshortcuts
    const uiFiles = await findFiles(rootDir, /\.(tsx|ts|html)$/);
    for (const file of uiFiles) {
        if (file.includes('node_modules'))
            continue;
        const content = fs_1.default.readFileSync(file, 'utf-8');
        // Simple heuristic for interactive buttons/links lacking accessibility
        if (content.includes('<button') && !content.includes('aria-label') && !content.includes('aria-labelledby')) {
            findings.push({
                id: 'UX-001',
                pillar: 'ux',
                severity: 'low',
                message: 'Button element detected without explicit ARIA label. Potential accessibility barrier.',
                file,
                autoFixable: false
            });
        }
        if (content.includes('addEventListener(\'keydown\'') && !content.includes('aria-keyshortcuts')) {
            findings.push({
                id: 'UX-002',
                pillar: 'ux',
                severity: 'low',
                message: 'Keyboard shortcut detected without aria-keyshortcuts attribute for screen reader discoverability.',
                file,
                autoFixable: true
            });
        }
    }
    return findings;
}
async function findFiles(dir, pattern) {
    let results = [];
    const list = fs_1.default.readdirSync(dir);
    for (const file of list) {
        const filePath = path_1.default.join(dir, file);
        const stat = fs_1.default.statSync(filePath);
        if (stat && stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                results = results.concat(await findFiles(filePath, pattern));
            }
        }
        else if (pattern.test(file)) {
            results.push(filePath);
        }
    }
    return results;
}
//# sourceMappingURL=ux.js.map