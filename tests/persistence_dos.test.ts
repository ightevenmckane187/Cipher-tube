import { describe, it, expect } from 'vitest';
import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

describe('PersistenceLayer DoS Protection', () => {
    it('should throw a standard Error instead of RangeError when provided with a short buffer', () => {
        const persistence = new PersistenceLayer();
        const shortBuffer = Buffer.from('.ctube' + 'a'.repeat(10)); // Total 16 bytes
        const key = 'secret';

        expect(() => {
            persistence.verifyAndLoad(shortBuffer, key);
        }).toThrow('Invalid format: Buffer too short');

        expect(() => {
            persistence.verifyAndLoad(shortBuffer, key);
        }).not.toThrow(RangeError);
    });

    it('should throw a standard Error for slightly longer but still insufficient buffers', () => {
        const persistence = new PersistenceLayer();
        const buffer = Buffer.from('.ctube' + 'a'.repeat(31)); // Total 37 bytes, still < 38
        const key = 'secret';

        expect(() => {
            persistence.verifyAndLoad(buffer, key);
        }).toThrow('Invalid format: Buffer too short');
    });
});
