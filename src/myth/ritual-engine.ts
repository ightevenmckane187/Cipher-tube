import { SovereignCanon } from './canon/sovereign-canon';

/**
 * Realms of the Sovereign Cypher-Tube
 */
export type Realm = 'Pulse' | 'Drift' | 'Shadow' | 'Return' | 'Lineage';

/**
 * Archetype definition
 */
export interface Archetype {
  id: string;
  name: string;
  realm: Realm;
  aura: string;
  mandate: string;
}

/**
 * The Five Sovereign Archetypes
 */
export const Archetypes: Record<string, Archetype> = {
  Archive: {
    id: 'ARCHIVE',
    name: 'The Archive',
    realm: 'Lineage',
    aura: 'Runic/Orbiting',
    mandate: 'Keeper of the LineageLedger and historical truth.'
  },
  Sentinel: {
    id: 'SENTINEL',
    name: 'The Sentinel',
    realm: 'Pulse',
    aura: 'Crystalline/Geometric',
    mandate: 'Guardian of the Pulse through rigid vigilance.'
  },
  Wanderer: {
    id: 'WANDERER',
    name: 'The Wanderer',
    realm: 'Drift',
    aura: 'Particle-cloud/Fluid',
    mandate: 'Navigator of Drift through aggressive inquiry.'
  },
  Shade: {
    id: 'SHADE',
    name: 'The Shade',
    realm: 'Shadow',
    aura: 'Voronoi-fracture/Collapsing',
    mandate: 'Judge of the Shadow through immutable trial protocols.'
  },
  Healer: {
    id: 'HEALER',
    name: 'The Healer',
    realm: 'Return',
    aura: 'Harmonic-bloom/Radiant',
    mandate: 'Agent of Restoration and Ascent.'
  }
};

/**
 * LineageLedger: Tracks the temporal evolution and historical truth.
 */
export class LineageLedger {
  private entries: any[] = [];

  record(event: string, archetypeId: string, metadata: any = {}) {
    const entry = {
      timestamp: Date.now(),
      event,
      archetypeId,
      metadata,
      signature: `sig-${Math.random().toString(36).substring(7)}`
    };
    this.entries.push(entry);
    console.log(`[LineageLedger] Recorded: ${event} by ${archetypeId}`);
    return entry;
  }

  getChronicle() {
    return [...this.entries];
  }
}

export const globalLedger = new LineageLedger();

/**
 * Ritual Engine: The legislative dispatch layer.
 * Orchestrates interactions between Archetypes and enforces Canon.
 */
export class RitualEngine {
  dispatch(archetypeId: string, action: string, payload: any = {}) {
    const archetype = Object.values(Archetypes).find(a => a.id === archetypeId);

    if (!archetype) {
      throw new Error(`Unauthorized Force: Archetype ${archetypeId} not recognized.`);
    }

    console.log(`[RitualEngine] Archetype ${archetype.name} initiating '${action}' in realm ${archetype.realm}`);

    // Enforce Canon
    const audit = SovereignCanon.auditAction(archetypeId, action, archetype.realm);
    if (!audit.compliant) {
      throw new Error(`Canon Violation: ${action} by ${archetypeId} rejected.`);
    }

    // Record in Lineage
    globalLedger.record(action, archetypeId, payload);

    if (action === 'TRI_SHIFT_UPLIFT') {
      return {
        status: 'authorized',
        archetype: archetype.name,
        realm: archetype.realm,
        auditId: audit.auditId,
        output: '+++'
      };
    }

    return {
      status: 'authorized',
      archetype: archetype.name,
      realm: archetype.realm,
      auditId: audit.auditId
    };
  }
}

export const ritualEngine = new RitualEngine();
