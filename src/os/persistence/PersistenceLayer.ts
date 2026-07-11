
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
        // Sentinel: Validate minimum length to prevent slicing errors and DoS (6 bytes header + 32 bytes signature)
        if (!buffer || buffer.length < 38) {
            throw new Error('Invalid or truncated persistent state payload');
        }

        const header = buffer.subarray(0, 6).toString();
        if (header !== '.ctube') throw new Error('Invalid format');

        const signature = buffer.subarray(6, 38);
        const payload = buffer.subarray(38).toString();

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const expectedSignature = hmac.digest();

        // Sentinel: Ensure constant-time comparison to prevent timing oracles.
        // Node.js timingSafeEqual throws if lengths differ, which we've guarded against above.
        if (!crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        try {
            return JSON.parse(payload);
        } catch (err) {
            throw new Error('Invalid or malformed persistent state payload');
        }
    }
}
