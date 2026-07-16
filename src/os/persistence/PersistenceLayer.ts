
import * as crypto from 'crypto';

const HEADER = Buffer.from('.ctube');
const SIGNATURE_LENGTH = 32;
const HEADER_LENGTH = HEADER.length;
const MIN_BUFFER_LENGTH = HEADER_LENGTH + SIGNATURE_LENGTH;

export class PersistenceLayer {
    /**
     * Bolt Optimization: Consolidate buffer allocations and use manual set/write for speed.
     * Sentinel: Hardened with HMAC-SHA256 and consistent header tagging.
     */
    save(data: any, key: string): Buffer {
        const payload = JSON.stringify(data);
        const payloadLength = Buffer.byteLength(payload);

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload); // Bolt: Manual string update is faster than intermediate Buffer
        const signature = hmac.digest();

        // Bolt Optimization: Buffer.allocUnsafe is faster for pre-filled buffers.
        const result = Buffer.allocUnsafe(HEADER_LENGTH + SIGNATURE_LENGTH + payloadLength);
        result.set(HEADER, 0);
        result.set(signature, HEADER_LENGTH);
        result.write(payload, HEADER_LENGTH + SIGNATURE_LENGTH);

        return result;
    }

    /**
     * Bolt Optimization: Use zero-copy subarray views and direct Buffer parsing.
     * Sentinel: Strict length validation and constant-time signature comparison.
     */
    verifyAndLoad(buffer: Buffer, key: string): any {
        // Sentinel: Explicit length check to prevent RangeError/TypeError in timingSafeEqual
        if (buffer.length < MIN_BUFFER_LENGTH) {
            throw new Error('Invalid format: Buffer too short');
        }

        const header = buffer.subarray(0, HEADER_LENGTH);
        if (!HEADER.equals(header)) {
            throw new Error('Invalid format: Header mismatch');
        }

        const signature = buffer.subarray(HEADER_LENGTH, HEADER_LENGTH + SIGNATURE_LENGTH);
        const payload = buffer.subarray(HEADER_LENGTH + SIGNATURE_LENGTH);

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload); // Bolt: subarray is zero-copy
        const expectedSignature = hmac.digest();

        // Sentinel: Constant-time comparison with length safety
        if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        try {
            // Bolt Optimization: Node.js v22+ JSON.parse processes Buffer directly
            return JSON.parse(payload as any);
        } catch (err) {
            throw new Error('Invalid format: JSON parse failed', { cause: err });
        }
    }
}
