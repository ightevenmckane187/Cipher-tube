/* eslint-disable @typescript-eslint/no-explicit-any */
import * as crypto from 'crypto';

// Bolt Optimization: Pre-allocate header buffer and length constants to prevent garbage collection churn.
const HEADER_BUF = Buffer.from('.ctube');
const HEADER_LEN = HEADER_BUF.length; // 6 bytes
const SIGNATURE_LEN = 32; // SHA-256 HMAC digest length (32 bytes)

export class PersistenceLayer {
    save(data: any, key: string): Buffer {
        const payload = JSON.stringify(data);
        const payloadByteLength = Buffer.byteLength(payload, 'utf8');

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const signature = hmac.digest();

        // Bolt Optimization: Pre-allocate single contiguous buffer using allocUnsafe
        // and copy directly using .set() and .write() instead of using Buffer.concat().
        const out = Buffer.allocUnsafe(HEADER_LEN + SIGNATURE_LEN + payloadByteLength);
        out.set(HEADER_BUF, 0);
        out.set(signature, HEADER_LEN);
        out.write(payload, HEADER_LEN + SIGNATURE_LEN, payloadByteLength, 'utf8');

        return out;
    }

    verifyAndLoad(buffer: Buffer, key: string): any {
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('Input must be a Buffer');
        }
        if (buffer.length < HEADER_LEN + SIGNATURE_LEN) {
            throw new Error('Invalid format');
        }

        // Bolt Optimization: Direct off-set string decoding avoids slice allocation.
        const header = buffer.toString('utf8', 0, HEADER_LEN);
        if (header !== '.ctube') throw new Error('Invalid format');

        // Bolt Optimization: Create fast non-allocating subarray views for signature and payload.
        const signature = buffer.subarray(HEADER_LEN, HEADER_LEN + SIGNATURE_LEN);
        const payloadBuffer = buffer.subarray(HEADER_LEN + SIGNATURE_LEN);

        // Bolt Optimization: Pass the Buffer view directly to hmac.update() to avoid decoding to string.
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payloadBuffer);
        const expectedSignature = hmac.digest();

        if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        // Bolt Optimization: Delay string decoding and JSON parsing until after integrity has been verified.
        const payloadStr = payloadBuffer.toString('utf8');
        try {
            return JSON.parse(payloadStr);
        } catch {
            throw new Error('Invalid JSON payload');
        }
    }
}
