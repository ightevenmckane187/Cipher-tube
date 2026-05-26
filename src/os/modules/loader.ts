import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { validateModule } from '../../predator/dsl/validator';
import { PredatorModule } from '../../predator/dsl/schema';

export class ModuleLoader {
  static loadFromPath(filePath: string): PredatorModule {
    console.log(`[Loader] Loading module from: ${filePath}`);
    const raw = fs.readFileSync(filePath, 'utf8');
    const doc = yaml.load(raw);

    validateModule(doc);
    return doc as PredatorModule;
  }

  static loadDefaultPredator(): PredatorModule {
    const predatorPath = path.join(process.cwd(), 'modules', 'cipher-tube.predator', 'predator.yml');
    return this.loadFromPath(predatorPath);
  }
}
