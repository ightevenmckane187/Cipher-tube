import { WizardReport, Finding } from "./engine.js";

export function generateMarkdownReport(report: WizardReport): string {
  let md = `## 🧙‍♂️ Wizard Analysis Report\n\n`;

  md += `**Overall Score: ${report.score}/100**\n\n`;

  md += `### 📊 Dimensions\n`;
  md += `- **Security**: ${report.dimensions.security}%\n`;
  md += `- **Performance**: ${report.dimensions.performance}%\n`;
  md += `- **UX/Accessibility**: ${report.dimensions.ux}%\n`;
  md += `- **Governance**: ${report.dimensions.governance}%\n`;
  md += `- **Merge Health**: ${report.dimensions.mergeHealth}%\n\n`;

  const recommendation = getRecommendation(report.score);
  md += `### 💡 Recommendation\n`;
  md += `${recommendation}\n\n`;

  if (report.findings.length > 0) {
    md += `### 🔍 Findings\n`;
    const severityEmoji: Record<string, string> = {
      critical: "🔴",
      high: "🟠",
      medium: "🟡",
      low: "🔵",
    };

    report.findings.forEach((f) => {
      md += `- ${severityEmoji[f.severity] || ""} **${f.pillar.toUpperCase()}**: ${f.message}`;
      if (f.file) md += ` (File: \`${f.file}\`)`;
      if (f.autoFixable) md += ` [Auto-fixable]`;
      md += `\n`;
    });
  } else {
    md += `✅ No issues found! Your code is Wizard-approved.\n`;
  }

  return md;
}

function getRecommendation(score: number): string {
  if (score >= 90)
    return "🟢 **Strongly recommended**: Excellent quality, ready for merge.";
  if (score >= 70)
    return "🟡 **Caution**: Good quality, but some minor issues detected or auto-fixed.";
  return "🔴 **Do not merge**: Significant issues detected that require attention.";
}
