import { SovereignCanon } from '../src/myth/canon/sovereign-canon';
import { seasonalEngine } from '../src/myth/seasonal-engine';
import { ritualEngine, globalLedger, Archetypes } from '../src/myth/ritual-engine';
import { executeGreatConvergence } from '../src/myth/rituals/great-convergence';

describe('Mythic-Technical Synchronicity Tests', () => {

  /**
   * Axiom Immutability Check
   */
  test('Axiom Immutability: Should prevent modification of Sovereign Canon', () => {
    const axioms = SovereignCanon.axioms as any;
    expect(Object.isFrozen(SovereignCanon)).toBe(true);
    expect(Object.isFrozen(axioms)).toBe(true);

    // Attempting modification should throw in strict mode or fail silently/error
    try {
      axioms[0].title = "Corrupted Mandate";
    } catch (e) {
      // Expected if in strict mode
    }
    expect(SovereignCanon.axioms[0].id).toBe('PRIME_MANDATE');
    expect(SovereignCanon.axioms[0].title).toBe('The Prime Mandate');
  });

  /**
   * Seasonal Transition Stress Test
   */
  test('Seasonal Transition: Genesis to Convergence rapid jump', async () => {
    expect(seasonalEngine.getCurrentEpoch()).toBe('Genesis');
    expect(seasonalEngine.getStrictness()).toBe(0.5);

    await executeGreatConvergence();

    expect(seasonalEngine.getCurrentEpoch()).toBe('Convergence');
    expect(seasonalEngine.getStrictness()).toBe(1.0);

    const chronicle = globalLedger.getChronicle();
    const convergenceEntry = chronicle.find(e => e.event === 'GREAT_CONVERGENCE_COMPLETE');
    expect(convergenceEntry).toBeDefined();
    expect(convergenceEntry.metadata.status).toBe('SYNCHRONIZED');
  });

  /**
   * Lineage Integrity Test
   */
  test('Lineage Integrity: Sentinel ritual recording', () => {
    const action = 'VIGILANCE_SCAN';
    const payload = { focus: 'heartbeat', integrity: 0.99 };

    const result = ritualEngine.dispatch('SENTINEL', action, payload);

    expect(result.status).toBe('authorized');
    expect(result.realm).toBe('Pulse');

    const chronicle = globalLedger.getChronicle();
    const lastEntry = chronicle[chronicle.length - 1];

    expect(lastEntry.event).toBe(action);
    expect(lastEntry.archetypeId).toBe('SENTINEL');
    expect(lastEntry.metadata.focus).toBe('heartbeat');
    expect(lastEntry.timestamp).toBeLessThanOrEqual(Date.now());

    const sentinel = Archetypes.Sentinel;
    expect(sentinel.aura).toBe('Crystalline/Geometric');
  });
});
