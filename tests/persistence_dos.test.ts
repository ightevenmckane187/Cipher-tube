import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';
import * as crypto from 'crypto';

describe('PersistenceLayer DoS Protection', () => {
    let persistence: PersistenceLayer;
    const key = 'test-sovereign-key';

    beforeEach(() => {
        persistence = new PersistenceLayer();
    });

    it('should throw RangeError when buffer is too short (VULNERABILITY REPRO)', () => {
        // Minimum valid length is 38 (6 header + 32 signature)
        const shortBuffer = Buffer.from('.ctube' + 'a'.repeat(31)); // 37 bytes

        // This currently throws "RangeError: Input buffers must have the same byte length"
        // from crypto.timingSafeEqual or slice issues.
        expect(() => {
            persistence.verifyAndLoad(shortBuffer, key);
        }).toThrow();
    });

    it('should handle malformed JSON payload gracefully', () => {
        const payload = '{ "invalid": json }';
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const signature = hmac.digest();
        const header = Buffer.from('.ctube');
        const buffer = Buffer.concat([header, signature, Buffer.from(payload)]);

        // This currently throws SyntaxError from JSON.parse
        expect(() => {
            persistence.verifyAndLoad(buffer, key);
        }).toThrow();
    });
});
