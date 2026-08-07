/* eslint-disable @typescript-eslint/no-explicit-any */
import * as crypto from 'crypto';

// Bolt Optimization: Pre-allocate static header buffer at module scope to avoid re-allocation.
const HEADER_BUF = Buffer.from('.ctube');

export class PersistenceLayer {
    save(data: any, key: string): Buffer {
        const payload = JSON.stringify(data);
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const signature = hmac.digest();

        // Bolt Optimization: Construct output buffer using Buffer.allocUnsafe() with manual copying
        // via Uint8Array.prototype.set and direct string writing. This avoids the overhead of Buffer.concat()
        // and redundant allocations.
        const payloadLen = Buffer.byteLength(payload, 'utf8');
        const out = Buffer.allocUnsafe(38 + payloadLen);
        out.set(HEADER_BUF, 0);
        out.set(signature, 6);
        out.write(payload, 38, payloadLen, 'utf8');
        return out;
    }

    verifyAndLoad(buffer: Buffer, key: string): any {
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('Input must be a Buffer');
        }
        if (buffer.length < 38) {
            throw new Error('Invalid format');
        }

        // Bolt Optimization: Compare header using fast .equals() on subarray view to avoid string allocation.
        if (!buffer.subarray(0, 6).equals(HEADER_BUF)) {
            throw new Error('Invalid format');
        }

        // Bolt Optimization: Use subarray() to create light-weight views instead of copying via .slice().
        const signature = buffer.subarray(6, 38);
        const payloadBuffer = buffer.subarray(38);

        // Bolt Optimization: Feed the payload Buffer directly into the HMAC update stream to avoid
        // converting it to a string before integrity verification. If integrity verification fails,
        // we throw immediately and entirely bypass payload string conversion and JSON parsing,
        // providing both a substantial speedup and robust protection against payload-based DoS.
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payloadBuffer);
        const expectedSignature = hmac.digest();

        if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        // Bolt Optimization: Postpone converting the payload buffer to a string until after the signature
        // has been fully validated in constant time.
        const payload = payloadBuffer.toString('utf8');
        try {
            return JSON.parse(payload);
        } catch {
            throw new Error('Invalid JSON payload');
        }
    }
}
