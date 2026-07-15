import { SovereignNodeSpecies } from "./NodeTaxonomy";

export class NodeTemplateFactory {
  static createNode(species: SovereignNodeSpecies, id: string) {
    return {
      id,
      species,
      createdAt: new Date().toISOString(),
      metadata: {},
    };
  }
}
