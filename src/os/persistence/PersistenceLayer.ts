
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
        try {
            // Sentinel: Enforce minimum length (6 bytes header + 32 bytes HMAC-SHA256 signature)
            if (!buffer || buffer.length < 38) {
                throw new Error('Invalid or malformed persistent state payload');
            }

            const header = buffer.slice(0, 6).toString();
            if (header !== '.ctube') throw new Error('Invalid format');

            const signature = buffer.slice(6, 38);
            const payload = buffer.slice(38).toString();

            const hmac = crypto.createHmac('sha256', key);
            hmac.update(payload);
            const expectedSignature = hmac.digest();

            // Sentinel: Ensure signatures have same length before comparison to prevent RangeError DoS
            if (signature.length !== expectedSignature.length) {
                throw new Error('Integrity check failed');
            }

            if (!crypto.timingSafeEqual(signature, expectedSignature)) {
                throw new Error('Integrity check failed');
            }

            return JSON.parse(payload);
        } catch (err: any) {
            // Sentinel: Map internal errors and JSON parsing failures to generic messages
            if (err.message === 'Invalid format' || err.message === 'Integrity check failed' || err.message === 'Invalid or malformed persistent state payload') {
                throw err;
            }
            throw new Error('Invalid or malformed persistent state payload');
        }
    }
}
