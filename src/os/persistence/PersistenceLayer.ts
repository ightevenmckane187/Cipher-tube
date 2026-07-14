
import * as crypto from 'crypto';

export class PersistenceLayer {
    save(data: any, key: string): Buffer {
        const payload = JSON.stringify(data);
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const signature = hmac.digest();

        const header = Buffer.from('.ctube');
        return Buffer.concat([header, signature, Buffer.from(payload)]);
    }

    verifyAndLoad(buffer: Buffer, key: string): any {
        // Sentinel: Enforce minimum buffer length (6 bytes header + 32 bytes signature)
        // to prevent DoS via timingSafeEqual length mismatch (TypeError).
        if (buffer.length < 38) {
            throw new Error('Persistent state buffer too short');
        }

        // Hardening: Use subarray() instead of slice() for zero-copy performance.
        const header = buffer.subarray(0, 6).toString();
        if (header !== '.ctube') throw new Error('Invalid format');

        const signature = buffer.subarray(6, 38);
        const payload = buffer.subarray(38).toString();

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const expectedSignature = hmac.digest();

        // Sentinel: Explicitly verify signature length matches expected digest (32 bytes for SHA-256)
        // before constant-time comparison to prevent timing oracles or internal exceptions.
        if (signature.length !== expectedSignature.length) {
            throw new Error('Integrity check failed: invalid signature length');
        }

        if (!crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        try {
            return JSON.parse(payload);
        } catch (err) {
            // Sentinel: Gracefully handle malformed state files without exposing JSON parser errors
            throw new Error('Invalid or malformed persistent state payload');
        }
    }
}
