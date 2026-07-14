
import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';
import * as crypto from 'crypto';

describe('PersistenceLayer DoS Regression Test', () => {
    const persistence = new PersistenceLayer();
    const key = 'test-key';

    it('should throw "Buffer too short" when buffer is too short', () => {
        const maliciousBuffer = Buffer.from('.ctube'); // Only header, missing signature/payload

        expect(() => {
            persistence.verifyAndLoad(maliciousBuffer, key);
        }).toThrow('Buffer too short');
    });


    it('should throw "Sovereign key mismatch" on invalid signature', () => {
        const header = Buffer.from('.ctube');
        const invalidSignature = Buffer.alloc(32, 0);
        const payload = Buffer.from('{}');
        const maliciousBuffer = Buffer.concat([header, invalidSignature, payload]);

        expect(() => {
            persistence.verifyAndLoad(maliciousBuffer, key);
        }).toThrow('Sovereign key mismatch');
    });

    it('should throw "malformed persistent state payload" when payload is invalid JSON', () => {
        const header = Buffer.from('.ctube');
        const payload = Buffer.from('invalid-json');
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const signature = hmac.digest();
        const maliciousBuffer = Buffer.concat([header, signature, payload]);

        expect(() => {
            persistence.verifyAndLoad(maliciousBuffer, key);
        }).toThrow('malformed persistent state payload');
    });

    it('should correctly save and load valid data', () => {
        const data = { sovereign: true, level: 99 };
        const saved = persistence.save(data, key);
        const loaded = persistence.verifyAndLoad(saved, key);
        expect(loaded).toEqual(data);
    });
});
