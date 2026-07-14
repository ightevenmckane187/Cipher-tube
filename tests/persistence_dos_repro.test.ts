
import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

describe('PersistenceLayer DoS Regression', () => {
    let persistence: PersistenceLayer;
    const key = 'test-sovereign-key';

    beforeEach(() => {
        persistence = new PersistenceLayer();
    });

    it('should throw a handled error when the buffer is too short (DoS Prevention)', () => {
        // Buffer too short to contain a valid signature (6 bytes header + 32 bytes signature = 38 bytes min)
        const malformedBuffer = Buffer.from('.ctube' + 'too-short');

        // We want to see a specific diagnostic error, not a generic TypeError from Node.js crypto
        expect(() => {
            persistence.verifyAndLoad(malformedBuffer, key);
        }).toThrow('Persistent state buffer too short');
    });

    it('should throw a handled error when the header is invalid', () => {
        const invalidHeader = Buffer.from('NOTCTB' + '0'.repeat(32) + '{"state":"test"}');
        expect(() => {
            persistence.verifyAndLoad(invalidHeader, key);
        }).toThrow('Invalid format');
    });

    it('should throw a handled error when the payload is malformed JSON', () => {
        // Create a validly signed but malformed JSON payload
        const data = 'not-json';
        const hmac = require('crypto').createHmac('sha256', key);
        hmac.update(data);
        const signature = hmac.digest();
        const buffer = Buffer.concat([Buffer.from('.ctube'), signature, Buffer.from(data)]);

        expect(() => {
            persistence.verifyAndLoad(buffer, key);
        }).toThrow('Invalid or malformed persistent state payload');
    });
});
