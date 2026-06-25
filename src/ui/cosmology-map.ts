import { Archetypes, globalLedger } from '../myth/ritual-engine';
import { seasonalEngine } from '../myth/seasonal-engine';

/**
 * Cosmology Map: Visualizes the "living soul" of the Sovereign Cypher-Tube.
 * Provides configurations for the Mythic Auras and Ledger Chronicle.
 */
export const CosmologyMap = {
  /**
   * Returns the CSS styles for Mythic Auras.
   */
  getAuraStyles: () => `
    .aura-runic { animation: runic-orbit 10s linear infinite; filter: drop-shadow(0 0 5px #00ccff); }
    .aura-crystalline { clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); background: rgba(0, 255, 65, 0.2); border: 1px solid #00ff41; }
    .aura-particle { filter: blur(2px); opacity: 0.8; animation: particle-drift 5s ease-in-out infinite alternate; }
    .aura-voronoi { background-image: radial-gradient(circle, #ff3300 1px, transparent 1px); background-size: 10px 10px; animation: voronoi-collapse 8s ease-in-out infinite; }
    .aura-harmonic { border-radius: 50%; box-shadow: 0 0 20px #cc33ff; animation: harmonic-bloom 4s ease-in-out infinite; }

    @keyframes runic-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes particle-drift { from { transform: translate(0, 0); } to { transform: translate(10px, 5px); } }
    @keyframes voronoi-collapse { 0%, 100% { transform: scale(1); } 50% { transform: scale(0.95); opacity: 0.5; } }
    @keyframes harmonic-bloom { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } }
  `,

  /**
   * Generates the interactive map configuration.
   */
  getMapConfig: () => {
    return {
      nodes: Object.values(Archetypes).map(a => ({
        id: a.id,
        label: a.name,
        group: a.realm,
        aura: a.aura
      })),
      edges: [
        { from: 'ARCHIVE', to: 'SENTINEL', label: 'pulse_sync' },
        { from: 'SENTINEL', to: 'WANDERER', label: 'drift_inquiry' },
        { from: 'WANDERER', to: 'SHADE', label: 'shadow_trial' },
        { from: 'SHADE', to: 'HEALER', label: 'return_ascent' },
        { from: 'HEALER', to: 'ARCHIVE', label: 'lineage_record' }
      ]
    };
  },

  /**
   * Ledger Chronicle: Temporal playback logic with resilience.
   */
  getChronicleLogic: () => `
    class LedgerChronicle {
      constructor(ledger) {
        this.entries = Array.isArray(ledger) ? [...ledger] : [];
        this.currentIndex = this.entries.length - 1;
        this.lastValidState = this.currentIndex >= 0 ? this.entries[this.currentIndex] : null;
      }

      /**
       * Resilience Sync: Ensures that if a ritual is interrupted,
       * we can always revert to the last valid state of the lineage.
       */
      sync() {
        if (this.entries.length > 0) {
          this.lastValidState = this.entries[this.entries.length - 1];
          this.currentIndex = this.entries.length - 1;
        }
      }

      playback(index) {
        if (index >= 0 && index < this.entries.length) {
          this.currentIndex = index;
          const entry = this.entries[index];
          console.log('[MythicPlayback] Navigating to:', entry.event, 'at', new Date(entry.timestamp).toISOString());
          return entry;
        }
        console.warn('[MythicPlayback] Attempted to access invalid temporal index:', index);
        return this.lastValidState;
      }

      next() { return this.playback(this.currentIndex + 1); }
      prev() { return this.playback(this.currentIndex - 1); }

      handleRitualInterruption() {
        console.log('[CosmologySync] Ritual interruption detected. Reverting to last valid state.');
        this.sync();
        return this.lastValidState;
      }
    }
  `
};
