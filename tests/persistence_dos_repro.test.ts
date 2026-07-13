import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';
import * as crypto from 'crypto';

describe('PersistenceLayer DoS Vulnerability', () => {
    const persistence = new PersistenceLayer();
    const key = 'test-key';

    it('should throw RangeError/TypeError on short buffers due to timingSafeEqual mismatch', () => {
        // Minimum valid length is 6 (header) + 32 (signature) = 38 bytes
        const malformedBuffer = Buffer.from('.ctube' + 'a'.repeat(10)); // Total 16 bytes

        // This is expected to throw a RangeError or TypeError because timingSafeEqual
        // compares a 10-byte buffer with a 32-byte expected signature.
        expect(() => {
            persistence.verifyAndLoad(malformedBuffer, key);
        }).toThrow();
    });

    it('should throw Error on invalid header', () => {
        const invalidHeaderBuffer = Buffer.from('NOTDOC' + 'a'.repeat(32) + '{}');
        expect(() => {
            persistence.verifyAndLoad(invalidHeaderBuffer, key);
        }).toThrow('Invalid format');
    });

    it('should successfully verify a valid buffer', () => {
        const data = { foo: 'bar' };
        const buffer = persistence.save(data, key);
        const result = persistence.verifyAndLoad(buffer, key);
        expect(result).toEqual(data);
    });
});
