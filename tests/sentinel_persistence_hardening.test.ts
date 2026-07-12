
import { describe, it, expect } from 'vitest';
import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

describe('PersistenceLayer Security Hardening', () => {
    const persistence = new PersistenceLayer();
    const key = 'test-sovereign-key';

    it('should prevent DoS from short buffers', () => {
        const tooShort = Buffer.from('.ctube' + 'a'.repeat(31)); // 37 bytes, should be 38+
        expect(() => persistence.verifyAndLoad(tooShort, key)).toThrow('Invalid or malformed persistent state payload');
    });

    it('should fail securely for invalid format headers', () => {
        const badHeader = Buffer.alloc(40);
        badHeader.write('.wrong', 0);
        expect(() => persistence.verifyAndLoad(badHeader, key)).toThrow('Invalid format');
    });

    it('should fail securely for integrity mismatch', () => {
        const data = { foo: 'bar' };
        const buffer = persistence.save(data, key);
        // Tamper with payload
        buffer[buffer.length - 1] ^= 0xFF;
        expect(() => persistence.verifyAndLoad(buffer, key)).toThrow('Integrity check failed');
    });

    it('should fail securely for malformed JSON', () => {
        const payload = '{"invalid": json';
        const hmac = require('crypto').createHmac('sha256', key);
        hmac.update(payload);
        const signature = hmac.digest();
        const buffer = Buffer.concat([Buffer.from('.ctube'), signature, Buffer.from(payload)]);

        expect(() => persistence.verifyAndLoad(buffer, key)).toThrow('Invalid or malformed persistent state payload');
    });

    it('should successfully save and load valid state', () => {
        const state = { sovereign: true, timestamp: Date.now() };
        const buffer = persistence.save(state, key);
        const loaded = persistence.verifyAndLoad(buffer, key);
        expect(loaded).toEqual(state);
    });
});
