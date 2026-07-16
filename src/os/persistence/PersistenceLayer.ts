
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
        // Sentinel: Ensure buffer is at least 6 bytes (header) + 32 bytes (HMAC-SHA256 signature)
        // to prevent slicing errors and provide a baseline for the structure.
        if (buffer.length < 38) {
            throw new Error('Invalid format: payload too short');
        }

        const header = buffer.slice(0, 6).toString();
        if (header !== '.ctube') throw new Error('Invalid format: missing header');

        const signature = buffer.slice(6, 38);
        const payload = buffer.slice(38).toString();

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const expectedSignature = hmac.digest();

        // Sentinel: Explicitly verify signature length before calling timingSafeEqual.
        // Node.js crypto.timingSafeEqual throws a RangeError if buffer lengths differ,
        // which can be exploited for Denial of Service (DoS).
        if (signature.length !== expectedSignature.length) {
            throw new Error('Integrity check failed: invalid signature length');
        }

        if (!crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        try {
            return JSON.parse(payload);
        } catch (e) {
            // Sentinel: Gracefully handle malformed JSON to avoid unhandled exceptions
            // escalating into 500-level errors or leaking internals.
            throw new Error('Invalid payload: JSON parse error');
        }
    }
}
