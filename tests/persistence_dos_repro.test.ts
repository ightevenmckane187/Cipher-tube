
import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

describe('PersistenceLayer DoS Repro', () => {
    let persistence: PersistenceLayer;
    const key = 'test-key';

    beforeEach(() => {
        persistence = new PersistenceLayer();
    });

    it('should throw Error (not RangeError) when buffer is too short for signature slice', () => {
        const shortBuffer = Buffer.concat([
            Buffer.from('.ctube'),
            Buffer.from('1234') // 4 bytes of "signature"
        ]);

        try {
            persistence.verifyAndLoad(shortBuffer, key);
            fail('Should have thrown');
        } catch (e: any) {
            // Should NOT be RangeError anymore
            expect(e instanceof RangeError).toBe(false);
            expect(e.message).toBe('Invalid or incomplete persistent state buffer');
        }
    });

    it('should throw Error (not RangeError) when buffer has enough bytes for header but not for full signature', () => {
        const buffer = Buffer.concat([
            Buffer.from('.ctube'),
            Buffer.alloc(10) // Only 10 bytes of signature instead of 32
        ]);

        try {
            persistence.verifyAndLoad(buffer, key);
            fail('Should have thrown');
        } catch (e: any) {
            expect(e instanceof RangeError).toBe(false);
            expect(e.message).toBe('Invalid or incomplete persistent state buffer');
        }
    });

    it('should throw malformed payload error on invalid JSON', () => {
        const validPayload = '{"a":1}';
        const hmac = require('crypto').createHmac('sha256', key);
        hmac.update('invalid-json');
        const sig = hmac.digest();

        const buffer = Buffer.concat([
            Buffer.from('.ctube'),
            sig,
            Buffer.from('invalid-json')
        ]);

        try {
            persistence.verifyAndLoad(buffer, key);
            fail('Should have thrown');
        } catch (e: any) {
            expect(e.message).toBe('Invalid or malformed persistent state payload');
        }
    });
});
