"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MergeResolver = void 0;
const simple_git_1 = require("simple-git");
const engine_js_1 = require("./engine.js");
class MergeResolver {
  constructor() {
    this.git = (0, simple_git_1.simpleGit)();
  }
  async attemptSmartMerge(targetBranch = "main") {
    engine_js_1.logger.info(`Attempting smart rebase with ${targetBranch}...`);
    try {
      await this.git.fetch("origin", targetBranch);
      // Try a rebase as requested by user strategy
      try {
        await this.git.rebase([`origin/${targetBranch}`]);
        engine_js_1.logger.info("Smart rebase successful!");
        return true;
      } catch (rebaseErr) {
        engine_js_1.logger.warn(
          "Standard rebase failed, checking for conflicts...",
        );
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
      engine_js_1.logger.error(`Merge failed: ${err}`);
      return false;
    }
  }
  async resolveConflicts(conflicts) {
    engine_js_1.logger.info(
      `Found ${conflicts.length} conflicted files. Attempting semantic resolution...`,
    );
    let allResolved = true;
    for (const file of conflicts) {
      const resolved = await this.resolveFileConflict(file);
      if (!resolved) allResolved = false;
    }
    if (allResolved) {
      engine_js_1.logger.info("All conflicts resolved semantically.");
      await this.git.add(".");
      await this.git.commit("🧙‍♂️ Wizard: Semantically resolved merge conflicts");
      return true;
    }
    return false;
  }
  async resolveFileConflict(file) {
    // Simple semantic rule: if the conflict is in a policy file or package.json,
    // we might have specific logic.
    // For now, if it's package-lock.json, we just regenerate it.
    if (file.endsWith("package-lock.json") || file.endsWith("pnpm-lock.yaml")) {
      engine_js_1.logger.info(
        `Resolving lockfile conflict in ${file} by preferring origin...`,
      );
      await this.git.checkout(["--theirs", file]);
      return true;
    }
    // Default: cannot resolve safely
    engine_js_1.logger.warn(
      `Cannot safely resolve conflict in ${file} automatically.`,
    );
    return false;
  }
}
exports.MergeResolver = MergeResolver;
//# sourceMappingURL=resolve-conflicts.js.map
