
import * as crypto from 'crypto';

export class PersistenceLayer {
    save(data: any, key: string): Buffer {
        const payload = JSON.stringify(data);
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const signature = hmac.digest();

        const header = Buffer.from('.ctube');
        // Hardening: Use Buffer.concat with pre-allocated buffer if performance is critical,
        // but for now, maintaining compatibility with the existing format.
        return Buffer.concat([header, signature, Buffer.from(payload)]);
    }

    verifyAndLoad(buffer: Buffer, key: string): any {
        // Sentinel: Validate buffer existence and minimum length (6 byte header + 32 byte signature)
        if (!buffer || buffer.length < 38) {
            throw new Error('Invalid or incomplete persistent state buffer');
        }

        // Hardening: Use subarray for zero-copy views instead of deprecated slice()
        const header = buffer.subarray(0, 6).toString();
        if (header !== '.ctube') throw new Error('Invalid format');

        const signature = buffer.subarray(6, 38);
        const payload = buffer.subarray(38).toString();

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const expectedSignature = hmac.digest();

        // Sentinel: Explicitly check signature length before timingSafeEqual to prevent RangeError DoS
        if (signature.length !== expectedSignature.length) {
            throw new Error('Integrity check failed: Invalid signature length');
        }

        if (!crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        try {
            return JSON.parse(payload);
        } catch (e) {
            throw new Error('Invalid or malformed persistent state payload');
        }
    }
}
