"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzePerformance = analyzePerformance;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function analyzePerformance(rootDir) {
  const findings = [];
  // 1. Check for non-pooled randomBytes
  const cryptoFiles = await findFiles(rootDir, /cta\.ts$|crypto.*\.ts$/);
  for (const file of cryptoFiles) {
    const content = fs_1.default.readFileSync(file, "utf-8");
    const matches = content.match(/crypto\.randomBytes\(/g);
    if (matches && matches.length > 5) {
      findings.push({
        id: "PERF-001",
        pillar: "performance",
        severity: "medium",
        message:
          "Multiple small crypto.randomBytes calls detected. Recommend entropy pooling for better performance.",
        file,
        autoFixable: true,
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
      if (file !== "node_modules" && file !== ".git") {
        results = results.concat(await findFiles(filePath, pattern));
      }
    } else if (pattern.test(file)) {
      results.push(filePath);
    }
  }
  return results;
}
//# sourceMappingURL=performance.js.map
