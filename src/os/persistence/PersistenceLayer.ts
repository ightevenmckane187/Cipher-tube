
import * as crypto from 'crypto';

/**
 * PersistenceLayer - Handles secure serialization and integrity verification for .ctube files.
 * Sentinel: Hardened against DoS via length validation and safe cryptographic comparisons.
 */
export class PersistenceLayer {
    /**
     * Serializes data into a signed .ctube buffer.
     */
    save(data: unknown, key: string): Buffer {
        const payload = JSON.stringify(data);
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const signature = hmac.digest();

        const header = Buffer.from('.ctube');
        // Bolt Optimization: Pre-allocate buffer for better performance
        const result = Buffer.allocUnsafe(header.length + signature.length + Buffer.byteLength(payload));
        header.copy(result, 0);
        signature.copy(result, header.length);
        result.write(payload, header.length + signature.length);
        return result;
    }

    /**
     * Verifies the integrity of a .ctube buffer and deserializes its content.
     * Sentinel: Implements strict structural validation to prevent DoS via timingSafeEqual mismatch.
     */
    verifyAndLoad(buffer: Buffer, key: string): any {
        // Sentinel: Enforce minimum length (6 byte header + 32 byte SHA-256 HMAC)
        if (!Buffer.isBuffer(buffer) || buffer.length < 38) {
            throw new Error('Invalid persistent state: payload too short or malformed');
        }

        // Bolt Optimization: Use subarray() for zero-copy views
        const header = buffer.subarray(0, 6).toString();
        if (header !== '.ctube') throw new Error('Invalid format: missing .ctube header');

        const signature = buffer.subarray(6, 38);
        const payload = buffer.subarray(38).toString('utf8');

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const expectedSignature = hmac.digest();

        // Sentinel: Ensure signatures are of identical length before constant-time comparison
        // to prevent Node.js from throwing RangeError (DoS vector).
        if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed: persistent state tampered with or invalid key');
        }

        try {
            return JSON.parse(payload);
        } catch (e: any) {
            // Sentinel: Gracefully handle JSON parsing errors for malformed state files.
            // Using explicit property assignment to satisfy 'preserve-caught-error' lint rule
            // without relying on ErrorOptions which might not be available in current TS target.
            const error = new Error('Invalid or malformed persistent state payload');
            (error as any).cause = e;
            throw error;
        }
    }
}
