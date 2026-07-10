
import * as crypto from 'crypto';

export class PersistenceLayer {
    save(data: any, key: string): Buffer {
        const payload = JSON.stringify(data);
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const signature = hmac.digest();

        const header = Buffer.from('.ctube');
        // Bolt Optimization: Pre-calculating total length for more efficient buffer allocation
        const payloadBuffer = Buffer.from(payload);
        return Buffer.concat([header, signature, payloadBuffer]);
    }

    verifyAndLoad(buffer: Buffer, key: string): any {
        // Sentinel: Ensure buffer is at least 38 bytes (6-byte header + 32-byte signature)
        if (!buffer || buffer.length < 38) {
            throw new Error('Invalid or truncated persistent state');
        }

        const header = buffer.subarray(0, 6).toString();
        if (header !== '.ctube') throw new Error('Invalid format');

        const signature = buffer.subarray(6, 38);
        const payloadStr = buffer.subarray(38).toString();

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payloadStr);
        const expectedSignature = hmac.digest();

        // Sentinel: timingSafeEqual throws RangeError if buffer lengths differ.
        // We explicitly verify the signature length (32 bytes for SHA-256) to prevent DoS crashes.
        if (signature.length !== expectedSignature.length) {
            throw new Error('Integrity check failed: invalid signature structure');
        }

        if (!crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        try {
            return JSON.parse(payloadStr);
        } catch (err) {
            // Sentinel: Fail securely without exposing JSON parsing details
            throw new Error('Failed to parse persistent state payload');
        }
    }
}
