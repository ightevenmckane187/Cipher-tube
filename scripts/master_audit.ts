import fs from 'fs';
const MAX_LINES = 50;
const NEW_FILES = ['src/governance/gatekeeper.ts', 'vault/src/index.ts', 'src/rust/graph-bridge.rs'];
function checkModularity() {
  let allPassed = true;
  for (const file of NEW_FILES) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    let currentFuncName = "";
    let funcStartLine = 0;
    let inFunc = false;
    let braceCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const tsMatch = line.match(/(?:public |private |static |async )?(?:function|class|constructor)\b\s*([a-zA-Z0-9_]+)?/);
      const rsMatch = line.match(/(?:pub )?fn\b\s*([a-zA-Z0-9_]+)/);
      if ((tsMatch || rsMatch) && !inFunc) {
        currentFuncName = (tsMatch ? tsMatch[1] : rsMatch![1]) || "anon";
        funcStartLine = i;
        inFunc = true;
        braceCount = 0;
      }
      if (inFunc) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        if (braceCount === 0 && line.includes('}')) {
          const length = i - funcStartLine + 1;
          if (length > MAX_LINES) {
            console.error(`❌ ${file}: Function '${currentFuncName}' is too long (${length} lines)`);
            allPassed = false;
          }
          inFunc = false;
        }
      }
    }
  }
  return allPassed;
}
function checkZKPHeaders() {
  const filesToAudit = ['src/server.ts', 'src/gateway/sessionMiddleware.ts', 'vault/src/index.ts'];
  let allPassed = true;
  for (const file of filesToAudit) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('x-cipher-proof') || content.includes('verifyCryptographicProof')) {
      console.log(`✅ ${file} contains ZKP integration.`);
    } else {
      console.error(`❌ ${file} missing ZKP integration.`);
      allPassed = false;
    }
  }
  return allPassed;
}
if (checkModularity() && checkZKPHeaders()) { console.log("✨ AUDIT PASSED ✨"); process.exit(0); }
else { console.error("🚨 AUDIT FAILED 🚨"); process.exit(1); }
