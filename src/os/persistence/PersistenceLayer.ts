/* eslint-disable @typescript-eslint/no-explicit-any */
import * as crypto from 'crypto';

// Bolt Optimization: Pre-allocate static header buffer to avoid repeated creation.
const HEADER_BUF = Buffer.from('.ctube');

export class PersistenceLayer {
    /**
     * Serializes, signs, and packages a payload.
     * Uses unsafe buffer allocation and manual copying to maximize performance and throughput.
     */
    save(data: any, key: string): Buffer {
        const payload = JSON.stringify(data);
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const signature = hmac.digest();

        const payloadByteLen = Buffer.byteLength(payload, 'utf8');
        const totalLength = 38 + payloadByteLen;

        // Bolt Optimization: Pre-allocate unsafe buffer to avoid zero-filling.
        // We write the complete payload so there's no data leakage risk.
        const outputBuffer = Buffer.allocUnsafe(totalLength);

        // Bolt Optimization: Directly set header, signature and write payload instead of Buffer.concat()
        outputBuffer.set(HEADER_BUF, 0);
        outputBuffer.set(signature, 6);
        outputBuffer.write(payload, 38, 'utf8');

        return outputBuffer;
    }

    /**
     * Verifies cryptographic signature and parses payload.
     * Uses high-performance binary matching, zero-copy subarrays, and offset-based toString.
     */
    verifyAndLoad(buffer: Buffer, key: string): any {
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('Input must be a Buffer');
        }
        if (buffer.length < 38) {
            throw new Error('Invalid format');
        }

        // Bolt Optimization: High-performance binary integer matching for '.ctube' to avoid string allocation.
        // '.' -> 0x2e, 'c' -> 0x63, 't' -> 0x74, 'u' -> 0x75 -> 0x2e637475
        // 'b' -> 0x62, 'e' -> 0x65 -> 0x6265
        if (buffer.readUInt32BE(0) !== 0x2e637475 || buffer.readUInt16BE(4) !== 0x6265) {
            throw new Error('Invalid format');
        }

        // Bolt Optimization: Extract zero-copy views using subarray instead of slice
        const signature = buffer.subarray(6, 38);
        const payloadSubarray = buffer.subarray(38);

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payloadSubarray);
        const expectedSignature = hmac.digest();

        if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        try {
            // Bolt Optimization: Perform offset-based toString conversion directly during parsing.
            return JSON.parse(buffer.toString('utf8', 38));
        } catch {
            throw new Error('Invalid JSON payload');
        }
    }
}
