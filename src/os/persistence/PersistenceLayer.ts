
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

    /**
     * Verifies and loads persistent state from a buffer.
     * Sentinel: Enforces structural validation and constant-time integrity checks.
     */
    verifyAndLoad(buffer: Buffer, key: string): any {
        // Sentinel: Ensure buffer is at least long enough for header (6) + signature (32)
        if (!buffer || buffer.length < 38) {
            throw new Error('Invalid or malformed persistent state: Payload too short');
        }

        const header = buffer.subarray(0, 6).toString();
        if (header !== '.ctube') {
            throw new Error('Invalid persistent state: Header mismatch');
        }

        const signature = buffer.subarray(6, 38);
        const payload = buffer.subarray(38).toString();

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const expectedSignature = hmac.digest();

        // Sentinel: Use timingSafeEqual to prevent timing attacks.
        // Node.js throws RangeError if lengths mismatch; we ensured 32-byte signature above.
        if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        try {
            return JSON.parse(payload);
        } catch (err) {
            // Sentinel: Handle malformed JSON gracefully to prevent unhandled exceptions
            throw new Error('Invalid or malformed persistent state payload');
        }
    }
}
