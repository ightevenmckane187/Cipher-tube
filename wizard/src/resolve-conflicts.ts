import { simpleGit, SimpleGit } from "simple-git";
import { logger } from "./engine.js";

export class MergeResolver {
  private git: SimpleGit;

  constructor() {
    this.git = simpleGit();
  }

  async attemptSmartMerge(targetBranch: string = "main"): Promise<boolean> {
    logger.info(`Attempting smart rebase with ${targetBranch}...`);

    try {
      await this.git.fetch("origin", targetBranch);

      // Try a rebase as requested by user strategy
      try {
        await this.git.rebase([`origin/${targetBranch}`]);
        logger.info("Smart rebase successful!");
        return true;
      } catch (rebaseErr: any) {
        logger.warn("Standard rebase failed, checking for conflicts...");

        const status = await this.git.status();
        if (status.conflicted.length > 0) {
          const resolved = await this.resolveConflicts(status.conflicted);
          if (resolved) {
            await this.git.rebase(["--continue"]);
            return true;
          }
          await this.git.rebase(["--abort"]);
        }
        throw rebaseErr;
      }
    } catch (err) {
      logger.error(`Merge failed: ${err}`);
      return false;
    }
  }

  private async resolveConflicts(conflicts: string[]): Promise<boolean> {
    logger.info(
      `Found ${conflicts.length} conflicted files. Attempting semantic resolution...`,
    );

    let allResolved = true;
    for (const file of conflicts) {
      const resolved = await this.resolveFileConflict(file);
      if (!resolved) allResolved = false;
    }

    if (allResolved) {
      logger.info("All conflicts resolved semantically.");
      await this.git.add(".");
      await this.git.commit("🧙‍♂️ Wizard: Semantically resolved merge conflicts");
      return true;
    }

    return false;
  }

  private async resolveFileConflict(file: string): Promise<boolean> {
    // Simple semantic rule: if the conflict is in a policy file or package.json,
    // we might have specific logic.
    // For now, if it's package-lock.json, we just regenerate it.
    if (file.endsWith("package-lock.json") || file.endsWith("pnpm-lock.yaml")) {
      logger.info(
        `Resolving lockfile conflict in ${file} by preferring origin...`,
      );
      await this.git.checkout(["--theirs", file]);
      return true;
    }

    // Default: cannot resolve safely
    logger.warn(`Cannot safely resolve conflict in ${file} automatically.`);
    return false;
  }
}
