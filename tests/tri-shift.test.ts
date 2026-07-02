import { ritualEngine } from '../src/myth/ritual-engine';
import { SovereignCanon } from '../src/myth/canon/sovereign-canon';

describe('Tri-Shift Ritual', () => {
    it('should allow the TRI_SHIFT_UPLIFT ritual for a valid archetype', () => {
        const result = ritualEngine.dispatch('SENTINEL', 'TRI_SHIFT_UPLIFT', { input: 'conconcom' });
        expect(result.status).toBe('authorized');
        expect(result.output).toBe('+++');
    });

    it('should have the TRI_SHIFT_UPLIFT axiom in the Sovereign Canon', () => {
        const axiom = SovereignCanon.axioms.find(a => a.id === 'TRI_SHIFT_UPLIFT');
        expect(axiom).toBeDefined();
        expect(axiom?.title).toBe('The Tri-Shift Uplift');
    });

    it('should throw error for unauthorized archetype', () => {
        expect(() => {
            ritualEngine.dispatch('INVALID', 'TRI_SHIFT_UPLIFT');
        }).toThrow('Unauthorized Force');
    });
});
