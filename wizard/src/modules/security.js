"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSecurity = analyzeSecurity;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function analyzeSecurity(rootDir) {
  const findings = [];
  // 1. Check for missing helmet in server.ts files
  const serverFiles = await findFiles(rootDir, /server\.ts$/);
  for (const file of serverFiles) {
    const content = fs_1.default.readFileSync(file, "utf-8");
    if (!content.includes("helmet(")) {
      findings.push({
        id: "SEC-001",
        pillar: "security",
        severity: "high",
        message: "Missing security headers (helmet) in Express/Fastify server.",
        file,
        autoFixable: true,
      });
    }
  }
  // 2. Check for weak crypto (createHash vs hash)
  const tsFiles = await findFiles(rootDir, /\.ts$/);
  for (const file of tsFiles) {
    if (file.includes("node_modules")) continue;
    const content = fs_1.default.readFileSync(file, "utf-8");
    if (content.includes("crypto.createHash(")) {
      findings.push({
        id: "SEC-002",
        pillar: "security",
        severity: "medium",
        message:
          "Use of legacy crypto.createHash detected. Recommend Node 21.7+ one-shot crypto.hash() for performance.",
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
//# sourceMappingURL=security.js.map
