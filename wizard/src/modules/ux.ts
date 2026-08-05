import fs from "fs";
import path from "path";
import { Finding } from "../engine.js";

export async function analyzeUX(rootDir: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // 1. Check for interactive elements without ARIA labels or keyshortcuts
  const uiFiles = await findFiles(rootDir, /\.(tsx|ts|html)$/);
  for (const file of uiFiles) {
    if (file.includes("node_modules")) continue;
    const content = fs.readFileSync(file, "utf-8");

    // Simple heuristic for interactive buttons/links lacking accessibility
    if (
      content.includes("<button") &&
      !content.includes("aria-label") &&
      !content.includes("aria-labelledby")
    ) {
      findings.push({
        id: "UX-001",
        pillar: "ux",
        severity: "low",
        message:
          "Button element detected without explicit ARIA label. Potential accessibility barrier.",
        file,
        autoFixable: false,
      });
    }

    if (
      content.includes("addEventListener('keydown'") &&
      !content.includes("aria-keyshortcuts")
    ) {
      findings.push({
        id: "UX-002",
        pillar: "ux",
        severity: "low",
        message:
          "Keyboard shortcut detected without aria-keyshortcuts attribute for screen reader discoverability.",
        file,
        autoFixable: true,
      });
    }
  }

  return findings;
}

async function findFiles(dir: string, pattern: RegExp): Promise<string[]> {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
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
