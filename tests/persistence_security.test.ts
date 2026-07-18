import { describe, it, expect } from 'vitest';
import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';
import * as crypto from 'crypto';

describe('PersistenceLayer Security & Hardening', () => {
    const key = 'secure-key-123';
    const persistence = new PersistenceLayer();

    it('should successfully save and load valid data', () => {
        const data = { sovereign: true, val: 42 };
        const buffer = persistence.save(data, key);

        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.length).toBeGreaterThanOrEqual(38);

        const loaded = persistence.verifyAndLoad(buffer, key);
        expect(loaded).toEqual(data);
    });

    it('should safely throw error for non-Buffer inputs', () => {
        expect(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            persistence.verifyAndLoad('not-a-buffer' as any, key);
        }).toThrow('Invalid format');
    });

    it('should safely throw error for too-short buffers', () => {
        const shortBuffer = Buffer.from('short');
        expect(() => {
            persistence.verifyAndLoad(shortBuffer, key);
        }).toThrow('Invalid format');
    });

    it('should safely throw error if header is invalid', () => {
        const data = { test: 'data' };
        const goodBuffer = persistence.save(data, key);

        // Corrupt header
        const badBuffer = Buffer.from(goodBuffer);
        badBuffer.write('X', 0); // corrupt first char of '.ctube'

        expect(() => {
            persistence.verifyAndLoad(badBuffer, key);
        }).toThrow('Invalid format');
    });

    it('should safely throw error on signature mismatch (tampered payload)', () => {
        const data = { test: 'data' };
        const goodBuffer = persistence.save(data, key);

        // Corrupt signature (bytes 6 to 37)
        const badBuffer = Buffer.from(goodBuffer);
        badBuffer.write('X', 10); // corrupt a byte in the middle of signature

        expect(() => {
            persistence.verifyAndLoad(badBuffer, key);
        }).toThrow('Integrity check failed');
    });

    it('should safely throw error if signature lengths match but signature is completely wrong', () => {
        const data = { test: 'data' };
        const goodBuffer = persistence.save(data, key);

        const badBuffer = Buffer.from(goodBuffer);
        const wrongSig = crypto.randomBytes(32);
        wrongSig.copy(badBuffer, 6);

        expect(() => {
            persistence.verifyAndLoad(badBuffer, key);
        }).toThrow('Integrity check failed');
    });

    it('should safely throw error for malformed JSON payload but valid signature', () => {
        // Construct a manual buffer where signature is correct but JSON is invalid
        const invalidJson = '{ malformed json';
        const payloadBuffer = Buffer.from(invalidJson, 'utf8');

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payloadBuffer);
        const signature = hmac.digest();

        const totalLen = 6 + 32 + payloadBuffer.length;
        const buffer = Buffer.allocUnsafe(totalLen);
        buffer.set(Buffer.from('.ctube'), 0);
        buffer.set(signature, 6);
        buffer.set(payloadBuffer, 38);

        expect(() => {
            persistence.verifyAndLoad(buffer, key);
        }).toThrow('Invalid JSON payload');
    });
});
