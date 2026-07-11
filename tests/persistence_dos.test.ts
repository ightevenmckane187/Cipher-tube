import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

describe('PersistenceLayer DoS Protection', () => {
    const pl = new PersistenceLayer();
    const key = 'secret-key';

    it('should throw an error when buffer is too short (DoS vector)', () => {
        const malformedBuffer = Buffer.from('.ctube' + 'too-short');
        // This is expected to throw RangeError in timingSafeEqual if not caught early
        expect(() => pl.verifyAndLoad(malformedBuffer, key)).toThrow();
    });

    it('should handle malformed JSON gracefully', () => {
        const payload = 'not-json';
        // Need to create a valid-ish signature for 'not-json' to reach JSON.parse
        const hmac = require('crypto').createHmac('sha256', key);
        hmac.update(payload);
        const signature = hmac.digest();

        const header = Buffer.from('.ctube');
        const buffer = Buffer.concat([header, signature, Buffer.from(payload)]);

        // JSON.parse would throw.
        expect(() => pl.verifyAndLoad(buffer, key)).toThrow();
    });
});
