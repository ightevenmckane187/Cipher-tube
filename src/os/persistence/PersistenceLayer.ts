/* eslint-disable @typescript-eslint/no-explicit-any */
import * as crypto from 'crypto';

// Bolt Optimization: Pre-allocate static header buffer as a module constant to avoid recreation
const HEADER_BUF = Buffer.from('.ctube');

export class PersistenceLayer {
    save(data: any, key: string): Buffer {
        const payload = JSON.stringify(data);
        // Bolt Optimization: Measure payload length in bytes and pre-allocate target Buffer unsafe-ly
        const payloadByteLength = Buffer.byteLength(payload, 'utf8');
        const totalLength = 6 + 32 + payloadByteLength;
        const buffer = Buffer.allocUnsafe(totalLength);

        // Bolt Optimization: Copy header and payload directly without array wrapping / Buffer.concat
        buffer.set(HEADER_BUF, 0);

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const signature = hmac.digest();

        buffer.set(signature, 6);
        buffer.write(payload, 38, payloadByteLength, 'utf8');

        return buffer;
    }

    verifyAndLoad(buffer: Buffer, key: string): any {
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('Input must be a Buffer');
        }
        if (buffer.length < 38) {
            throw new Error('Invalid format');
        }

        // Bolt Optimization: Compare header using fast subarray check without string decoding
        if (!buffer.subarray(0, 6).equals(HEADER_BUF)) {
            throw new Error('Invalid format');
        }

        // Bolt Optimization: Obtain signature view as subarray without copying
        const signature = buffer.subarray(6, 38);

        // Bolt Optimization: Pass the payload buffer view directly to HMAC.update to avoid string decoding before validation
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(buffer.subarray(38));
        const expectedSignature = hmac.digest();

        // Sentinel: Ensure buffer lengths match before calling timingSafeEqual
        if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        // Bolt Optimization: Decode the payload string using offset-based toString only after cryptographic validation passes
        const payload = buffer.toString('utf8', 38);

        try {
            return JSON.parse(payload);
        } catch {
            throw new Error('Invalid JSON payload');
        }
    }
}
