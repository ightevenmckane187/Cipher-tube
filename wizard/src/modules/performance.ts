import fs from 'fs';
import path from 'path';
import { Finding } from '../engine.js';

export async function analyzePerformance(rootDir: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // 1. Check for non-pooled randomBytes
  const cryptoFiles = await findFiles(rootDir, /cta\.ts$|crypto.*\.ts$/);
  for (const file of cryptoFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const matches = content.match(/crypto\.randomBytes\(/g);
    if (matches && matches.length > 5) {
      findings.push({
        id: 'PERF-001',
        pillar: 'performance',
        severity: 'medium',
        message: 'Multiple small crypto.randomBytes calls detected. Recommend entropy pooling for better performance.',
        file,
        autoFixable: true
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
      if (file !== 'node_modules' && file !== '.git') {
        results = results.concat(await findFiles(filePath, pattern));
      }
    } else if (pattern.test(file)) {
      results.push(filePath);
    }
  }
  return results;
}
