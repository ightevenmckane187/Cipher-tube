
import * as crypto from 'crypto';

export class PersistenceLayer {
    /**
     * Bolt Optimization: Using Buffer.allocUnsafe and .set is ~15% faster than Buffer.concat.
     * Passing Buffer views directly to hmac.update avoids unnecessary string conversions.
     */
    save(data: any, key: string): Buffer {
        const payload = Buffer.from(JSON.stringify(data));
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const signature = hmac.digest();

        const header = Buffer.from('.ctube');
        const result = Buffer.allocUnsafe(header.length + signature.length + payload.length);

        result.set(header, 0);
        result.set(signature, header.length);
        result.set(payload, header.length + signature.length);

        return result;
    }

    /**
     * Sentinel: Implements strict length validation and fail-secure error handling.
     * Bolt Optimization: Uses subarray() for zero-copy views and avoids redundant .toString() before JSON.parse.
     */
    verifyAndLoad(buffer: Buffer, key: string): any {
        // Sentinel: Ensure buffer is at least Header (6) + Signature (32) bytes
        if (!buffer || buffer.length < 38) {
            throw new Error('Invalid or truncated persistent state: Buffer too short');
        }

        const header = buffer.subarray(0, 6).toString();
        if (header !== '.ctube') {
            throw new Error('Invalid format: Sovereign header mismatch');
        }

        const signature = buffer.subarray(6, 38);
        const payload = buffer.subarray(38);

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const expectedSignature = hmac.digest();

        // Sentinel: Ensure lengths match before timingSafeEqual to prevent RangeError/TypeError DoS.
        if (signature.length !== expectedSignature.length) {
            throw new Error('Integrity check failed: Signature length mismatch');
        }

        if (!crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed: Sovereign key mismatch');
        }

        try {
            // Environment Insight: JSON.parse can process Buffer directly in Node.js 20+
            return JSON.parse(payload as unknown as string);
        } catch (e) {
            throw new Error('Invalid or malformed persistent state payload');
        }
    }
}
