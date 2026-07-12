
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
        // Sentinel: Enforce minimum length (6 bytes header + 32 bytes signature)
        if (!buffer || buffer.length < 38) {
            throw new Error('Invalid format: Buffer too short');
        }

        const header = buffer.subarray(0, 6).toString();
        if (header !== '.ctube') throw new Error('Invalid format: Header mismatch');

        const signature = buffer.subarray(6, 38);
        const payload = buffer.subarray(38).toString();

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const expectedSignature = hmac.digest();

        // Sentinel: Ensure signature lengths match before timingSafeEqual to prevent process crash (DoS)
        if (signature.length !== expectedSignature.length) {
            throw new Error('Integrity check failed: Signature length mismatch');
        }

        if (!crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        try {
            return JSON.parse(payload);
        } catch (error: any) {
            const wrappedError = new Error('Invalid or malformed persistent state payload');
            (wrappedError as any).cause = error;
            throw wrappedError;
        }
    }
}
