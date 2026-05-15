import fs from 'fs';
import path from 'path';
import { Finding } from '../engine.js';

export async function analyzeSecurity(rootDir: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // 1. Check for missing helmet in server.ts files
  const serverFiles = await findFiles(rootDir, /server\.ts$/);
  for (const file of serverFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    if (!content.includes('helmet(')) {
      findings.push({
        id: 'SEC-001',
        pillar: 'security',
        severity: 'high',
        message: 'Missing security headers (helmet) in Express/Fastify server.',
        file,
        autoFixable: true
      });
    }
  }

  // 2. Check for weak crypto (createHash vs hash)
  const tsFiles = await findFiles(rootDir, /\.ts$/);
  for (const file of tsFiles) {
    if (file.includes('node_modules')) continue;
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes('crypto.createHash(')) {
      findings.push({
        id: 'SEC-002',
        pillar: 'security',
        severity: 'medium',
        message: 'Use of legacy crypto.createHash detected. Recommend Node 21.7+ one-shot crypto.hash() for performance.',
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
