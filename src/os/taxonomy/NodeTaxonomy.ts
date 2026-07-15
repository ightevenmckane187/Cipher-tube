export enum SovereignNodeSpecies {
  TOOLBOX = "Toolbox",
  RITUAL = "Ritual",
  ARCHETYPE = "Archetype",
  DIAGNOSTIC = "Diagnostic",
}

export interface NodeMetadata {
  species: SovereignNodeSpecies;
  identity806: string;
  mandate: string;
}

export const NODE_TAXONOMY: Record<string, NodeMetadata> = {
  "sentinel-node": {
    species: SovereignNodeSpecies.ARCHETYPE,
    identity806: "806-SENTINEL",
    mandate: "Guard the Pulse with rigid vigilance.",
  },
  "wanderer-node": {
    species: SovereignNodeSpecies.ARCHETYPE,
    identity806: "806-WANDERER",
    mandate: "Navigate the Drift through aggressive inquiry.",
  },
  "shade-node": {
    species: SovereignNodeSpecies.ARCHETYPE,
    identity806: "806-SHADE",
    mandate: "Judge the Shadow through immutable trial protocols.",
  },
  "healer-node": {
    species: SovereignNodeSpecies.ARCHETYPE,
    identity806: "806-HEALER",
    mandate: "Restore the Return through harmonic ascent.",
  },
  "archive-node": {
    species: SovereignNodeSpecies.ARCHETYPE,
    identity806: "806-ARCHIVE",
    mandate: "Preserve the Lineage in the LineageLedger.",
  },
};
