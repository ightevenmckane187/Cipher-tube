/* eslint-disable @typescript-eslint/no-explicit-any */
import * as crypto from 'crypto';

const HEADER_MAGIC = Buffer.from('.ctube');
const HEADER_LENGTH = 6;
const SIGNATURE_LENGTH = 32;

export class PersistenceLayer {
    /**
     * Serializes payload data with header magic and HMAC-SHA256 signature into a Buffer.
     * Uses Buffer.alloc to eliminate uninitialized memory leak risks.
     */
    save(data: any, key: string): Buffer {
        const payload = JSON.stringify(data);
        const payloadByteLength = Buffer.byteLength(payload, 'utf8');

        // Compute HMAC-SHA256 over UTF-8 payload bytes directly
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload, 'utf8');
        const signature = hmac.digest();

        // Safely allocate zero-filled buffer for header (6 bytes) + signature (32 bytes) + payload
        const out = Buffer.alloc(HEADER_LENGTH + SIGNATURE_LENGTH + payloadByteLength);

        // Copy magic header
        out.set(HEADER_MAGIC, 0);
        // Copy HMAC signature
        out.set(signature, HEADER_LENGTH);
        // Direct UTF-8 write of payload
        out.write(payload, HEADER_LENGTH + SIGNATURE_LENGTH, payloadByteLength, 'utf8');

        return out;
    }

    /**
     * Verifies payload integrity via HMAC-SHA256 and deserializes JSON content.
     * Uses zero-copy subarray views and fast binary integer header validation.
     */
    verifyAndLoad(buffer: Buffer, key: string): any {
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('Input must be a Buffer');
        }
        if (buffer.length < HEADER_LENGTH + SIGNATURE_LENGTH) {
            throw new Error('Invalid format');
        }

        // High-performance binary integer matching for '.ctube' magic header
        if (buffer.readUInt32BE(0) !== 0x2e637475 || buffer.readUInt16BE(4) !== 0x6265) {
            throw new Error('Invalid format');
        }

        // Zero-copy subarray views
        const signature = buffer.subarray(HEADER_LENGTH, HEADER_LENGTH + SIGNATURE_LENGTH);
        const payloadSubarray = buffer.subarray(HEADER_LENGTH + SIGNATURE_LENGTH);

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payloadSubarray);
        const expectedSignature = hmac.digest();

        // Constant-time signature verification
        if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        // Decode payload to string only when passing to JSON.parse()
        const payloadStr = payloadSubarray.toString('utf8');
        try {
            return JSON.parse(payloadStr);
        } catch {
            throw new Error('Invalid JSON payload');
        }
    }
}
