
import { describe, it, expect } from 'vitest';
import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

describe('PersistenceLayer Hardening Verification', () => {
    it('should throw descriptive Error instead of RangeError on short buffer', () => {
        const persistence = new PersistenceLayer();
        const shortBuffer = Buffer.from('.ctube-too-short'); // Less than 38 bytes

        expect(() => {
            persistence.verifyAndLoad(shortBuffer, 'some-key');
        }).toThrow('Invalid or truncated persistent state');

        expect(() => {
            persistence.verifyAndLoad(shortBuffer, 'some-key');
        }).not.toThrow(RangeError);
    });

    it('should throw descriptive Error instead of RangeError on truncated buffer', () => {
        const persistence = new PersistenceLayer();
        // 6 bytes header + 10 bytes signature (instead of 32) = 16 bytes
        const malformedBuffer = Buffer.concat([
            Buffer.from('.ctube'),
            Buffer.alloc(10)
        ]);

        expect(() => {
            persistence.verifyAndLoad(malformedBuffer, 'some-key');
        }).toThrow('Invalid or truncated persistent state');

        expect(() => {
            persistence.verifyAndLoad(malformedBuffer, 'some-key');
        }).not.toThrow(RangeError);
    });

    it('should throw descriptive Error on malformed JSON payload', () => {
        const persistence = new PersistenceLayer();
        const data = "not-json";
        const key = 'secret-key';

        // Manually construct a validly signed but malformed JSON payload
        const hmac = require('crypto').createHmac('sha256', key);
        hmac.update(data);
        const signature = hmac.digest();
        const header = Buffer.from('.ctube');
        const buffer = Buffer.concat([header, signature, Buffer.from(data)]);

        expect(() => {
            persistence.verifyAndLoad(buffer, key);
        }).toThrow('Failed to parse persistent state payload');
    });
});
