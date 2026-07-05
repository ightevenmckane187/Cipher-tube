import { PredatorModule } from "../../predator/dsl/schema";

export class ModuleRegistry {
  private modules: Map<string, PredatorModule> = new Map();

  register(mod: PredatorModule) {
    console.log(`[Registry] Registering module: ${mod.module} v${mod.version}`);
    this.modules.set(mod.module, mod);
  }

  getModule(name: string): PredatorModule | undefined {
    return this.modules.get(name);
  }
}

export const globalRegistry = new ModuleRegistry();
