import { simpleGit, SimpleGit } from 'simple-git';
import pino from 'pino';
import { analyzeSecurity } from './modules/security.js';
import { analyzePerformance } from './modules/performance.js';
import { analyzeUX } from './modules/ux.js';
import { analyzeGovernance } from './modules/governance.js';
import { repairSecurity } from './repairs/security.js';
import { repairPerformance } from './repairs/performance.js';
import { MergeResolver } from './resolve-conflicts.js';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
});

export interface WizardReport {
  score: number;
  dimensions: {
    security: number;
    performance: number;
    ux: number;
    governance: number;
    mergeHealth: number;
  };
  findings: Finding[];
}

export interface Finding {
  id: string;
  pillar: 'security' | 'performance' | 'ux' | 'governance' | 'merge';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  file?: string;
  line?: number;
  autoFixable: boolean;
  fix?: () => Promise<void>;
}

export class WizardEngine {
  private git: SimpleGit;
  private resolver: MergeResolver;

  constructor() {
    this.git = simpleGit();
    this.resolver = new MergeResolver();
  }

  async analyze(): Promise<WizardReport> {
    logger.info('Starting Wizard Analysis...');
    const rootDir = process.cwd();

    const securityFindings = await analyzeSecurity(rootDir);
    const perfFindings = await analyzePerformance(rootDir);
    const uxFindings = await analyzeUX(rootDir);
    const govFindings = await analyzeGovernance(rootDir);

    const findings = [
      ...securityFindings,
      ...perfFindings,
      ...uxFindings,
      ...govFindings
    ];

    const securityScore = Math.max(0, 100 - securityFindings.length * 20);
    const perfScore = Math.max(0, 100 - perfFindings.length * 15);
    const uxScore = Math.max(0, 100 - uxFindings.length * 10);
    const govScore = Math.max(0, 100 - govFindings.length * 25);

    const status = await this.git.status();
    const mergeScore = status.conflicted.length === 0 ? 100 : 0;

    const overallScore = Math.round(
      (securityScore + perfScore + uxScore + govScore + mergeScore) / 5
    );

    return {
      score: overallScore,
      dimensions: {
        security: securityScore,
        performance: perfScore,
        ux: uxScore,
        governance: govScore,
        mergeHealth: mergeScore
      },
      findings
    };
  }

  async repair(report: WizardReport): Promise<void> {
    logger.info('Starting Wizard Repair...');

    for (const finding of report.findings) {
      if (!finding.autoFixable) continue;

      logger.info(`Applying repair for ${finding.id}: ${finding.message}`);

      try {
        switch (finding.pillar) {
          case 'security':
            await repairSecurity(finding);
            break;
          case 'performance':
            await repairPerformance(finding);
            break;
          // Add others as needed
        }
      } catch (err) {
        logger.error(`Failed to repair ${finding.id}: ${err}`);
      }
    }

    // After repairs, check if we need to commit
    const status = await this.git.status();
    if (status.modified.length > 0) {
      const isRisky = status.modified.length > 3 || status.modified.some(f => f.includes('governance/') || f.includes('crypto/'));

      if (isRisky) {
        const branchName = `wizard-fix/${Math.random().toString(36).substring(7)}`;
        logger.info(`Risky changes detected, moving to separate branch: ${branchName}`);
        await this.git.checkout(['-b', branchName]);
        await this.git.add('.');
        await this.git.commit('🧙‍♂️ Wizard: Applied complex repairs (risky)');
        // In real CI we would push and open a PR
      } else {
        logger.info('Safe changes detected, committing directly...');
        await this.git.add('.');
        await this.git.commit('🧙‍♂️ Wizard: Auto-applied security and performance repairs');
      }
    }
  }
}
