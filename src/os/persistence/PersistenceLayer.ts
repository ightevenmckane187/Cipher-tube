
import * as crypto from 'crypto';

// Bolt Optimization: Pre-allocate header Buffer at module scope
const HEADER = Buffer.from('.ctube');
const HEADER_LENGTH = HEADER.length;
const SIGNATURE_LENGTH = 32; // SHA-256 HMAC length

export class PersistenceLayer {
    save(data: any, key: string): Buffer {
        // Bolt Optimization: Pre-calculate JSON as Buffer for single-pass processing
        const payload = Buffer.from(JSON.stringify(data));

        const hmac = crypto.createHmac('sha256', key);
        // Bolt Optimization: Pass Buffer directly to update() to avoid string decoding
        hmac.update(payload);
        const signature = hmac.digest();

        // Bolt Optimization: Use allocUnsafe and manual set for ~15% faster buffer construction than Buffer.concat
        const result = Buffer.allocUnsafe(HEADER_LENGTH + SIGNATURE_LENGTH + payload.length);
        result.set(HEADER, 0);
        result.set(signature, HEADER_LENGTH);
        result.set(payload, HEADER_LENGTH + SIGNATURE_LENGTH);
        return result;
    }

    verifyAndLoad(buffer: Buffer, key: string): any {
        // Sentinel: Minimum length check to prevent subarray out-of-bounds or slice issues
        if (buffer.length < HEADER_LENGTH + SIGNATURE_LENGTH) {
            throw new Error('Invalid or truncated persistent state');
        }

        // Bolt Optimization: Use .subarray() for zero-copy views instead of .slice()
        const header = buffer.subarray(0, HEADER_LENGTH);
        // Bolt Optimization: Buffer.equals() is faster than .toString() comparison
        if (!HEADER.equals(header)) throw new Error('Invalid format');

        const signature = buffer.subarray(HEADER_LENGTH, HEADER_LENGTH + SIGNATURE_LENGTH);
        const payload = buffer.subarray(HEADER_LENGTH + SIGNATURE_LENGTH);

        const hmac = crypto.createHmac('sha256', key);
        // Bolt Optimization: Pass Buffer subarray directly to update()
        hmac.update(payload);
        const expectedSignature = hmac.digest();

        // Sentinel: timingSafeEqual is mandatory for security
        // Bolt Optimization: Check lengths first even though signature length is constant for SHA-256
        if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        // Bolt Optimization: JSON.parse() can accept a Buffer directly in Node.js, avoiding .toString()
        try {
            return JSON.parse(payload as any);
        } catch (err) {
            throw new Error('Invalid or malformed persistent state payload');
        }
    }
}
