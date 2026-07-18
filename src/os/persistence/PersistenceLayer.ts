import * as crypto from 'crypto';

export class PersistenceLayer {
    save(data: any, key: string): any {
        const payload = JSON.stringify(data);
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const signature = hmac.digest();

        const header = Buffer.from('.ctube');
        return Buffer.concat([header, signature, Buffer.from(payload)]);
    }

    verifyAndLoad(buffer: any, key: string): any {
        // Sentinel: Ensure input is a valid Buffer object to prevent crash on unexpected types
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('Input must be a Buffer');
        }

        // Sentinel: Ensure buffer length is sufficient to contain header (6 bytes) and SHA-256 signature (32 bytes)
        if (buffer.length < 38) {
            throw new Error('Invalid format');
        }

        const header = buffer.slice(0, 6).toString();
        if (header !== '.ctube') throw new Error('Invalid format');

        const signature = buffer.slice(6, 38);
        const payload = buffer.slice(38).toString();

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const expectedSignature = hmac.digest();

        // Sentinel: Explicit length match check before timingSafeEqual to prevent RangeError/TypeError crash
        if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        try {
            return JSON.parse(payload);
        } catch {
            throw new Error('Invalid JSON payload');
        }
    }
}
