import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { AuthorityChainManifest } from './types';
import { AuthorityChainValidator } from './validator';

export class AuthorityChainLoader {
  private static manifestPath = path.join(__dirname, 'authority_chain.yaml');

  public static load(): AuthorityChainManifest {
    try {
      const fileContents = fs.readFileSync(this.manifestPath, 'utf8');
      const data = yaml.load(fileContents);

      if (AuthorityChainValidator.validate(data)) {
        return data;
      }

      throw new Error('Invalid manifest structure');
    } catch (error: any) {
      throw new Error(`Failed to load Authority Chain Manifest: ${error.message}`);
    }
  }
}
