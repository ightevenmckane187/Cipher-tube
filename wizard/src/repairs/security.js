"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.repairSecurity = repairSecurity;
const fs_1 = __importDefault(require("fs"));
async function repairSecurity(finding) {
  if (!finding.file) return;
  const content = fs_1.default.readFileSync(finding.file, "utf-8");
  if (finding.id === "SEC-001") {
    // Add helmet to Express/Fastify
    if (content.includes("import express")) {
      let newContent = content.replace(
        "import express",
        "import express\nimport helmet from 'helmet'",
      );
      newContent = newContent.replace(
        "const app = express()",
        "const app = express()\napp.use(helmet())",
      );
      fs_1.default.writeFileSync(finding.file, newContent);
    }
  }
  if (finding.id === "SEC-002") {
    // Replace legacy createHash with Node 21.7+ crypto.hash()
    const newContent = content.replace(
      /crypto\.createHash\(['"](.+?)['"]\)\.update\((.+?)\)\.digest\(['"]hex['"]\)/g,
      'crypto.hash("$1", $2)',
    );
    fs_1.default.writeFileSync(finding.file, newContent);
  }
}
//# sourceMappingURL=security.js.map
