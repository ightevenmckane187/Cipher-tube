import fs from 'fs';
import { Finding } from '../engine.js';

export async function repairSecurity(finding: Finding): Promise<void> {
  if (!finding.file) return;
  const content = fs.readFileSync(finding.file, 'utf-8');

  if (finding.id === 'SEC-001') {
    // Add helmet to Express/Fastify
    if (content.includes('import express')) {
       let newContent = content.replace('import express', 'import express\nimport helmet from \'helmet\'');
       newContent = newContent.replace('const app = express()', 'const app = express()\napp.use(helmet())');
       fs.writeFileSync(finding.file, newContent);
    }
  }

  if (finding.id === 'SEC-002') {
    // Replace legacy createHash with Node 21.7+ crypto.hash()
    const newContent = content.replace(
      /crypto\.createHash\(['"](.+?)['"]\)\.update\((.+?)\)\.digest\(['"]hex['"]\)/g,
      'crypto.hash("$1", $2)'
    );
    fs.writeFileSync(finding.file, newContent);
  }
}
