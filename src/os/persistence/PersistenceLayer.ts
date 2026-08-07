/* eslint-disable @typescript-eslint/no-explicit-any */
import * as crypto from 'crypto';

// Bolt Optimization: Pre-allocate static header buffer to avoid redundant allocations on save/load
const HEADER_PREFIX = '.ctube';
const HEADER_LENGTH = 6;
const SIGNATURE_LENGTH = 32; // SHA-256 is 32 bytes

export class PersistenceLayer {
    /**
     * Bolt Optimization: Construct output buffer using Buffer.allocUnsafe() with manual
     * offset-based copying and hashing to avoid expensive Buffer.concat and intermediate payload buffer allocations.
     */
    save(data: any, key: string): Buffer {
        const payload = JSON.stringify(data);
        const payloadLength = Buffer.byteLength(payload, 'utf8');

        // Total buffer: 6 (header) + 32 (signature) + payloadLength
        const totalLength = HEADER_LENGTH + SIGNATURE_LENGTH + payloadLength;
        const outBuffer = Buffer.allocUnsafe(totalLength);

        // 1. Write the header directly to the buffer
        outBuffer.write(HEADER_PREFIX, 0, HEADER_LENGTH, 'utf8');

        // 2. Write the payload directly to the buffer at offset 38
        outBuffer.write(payload, HEADER_LENGTH + SIGNATURE_LENGTH, payloadLength, 'utf8');

        // 3. Obtain a zero-copy subarray view of the payload to generate the hmac signature
        const payloadSub = outBuffer.subarray(HEADER_LENGTH + SIGNATURE_LENGTH, totalLength);
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payloadSub);
        const signature = hmac.digest();

        // 4. Copy the generated signature into the output buffer at offset 6
        signature.copy(outBuffer, HEADER_LENGTH);

        return outBuffer;
    }

    /**
     * Bolt Optimization: Validate header using high-performance binary integer matching,
     * utilize zero-copy subarray views instead of slice, and avoid redundant string conversions.
     */
    verifyAndLoad(buffer: Buffer, key: string): any {
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('Input must be a Buffer');
        }
        if (buffer.length < HEADER_LENGTH + SIGNATURE_LENGTH) {
            throw new Error('Invalid format');
        }

        // Bolt Optimization: High-performance binary integer matching avoids string allocations and decoding overhead entirely.
        // '.ctube' translates to:
        // Bytes 0-3: '.' 'c' 't' 'u' = 0x2e637475
        // Bytes 4-5: 'b' 'e'         = 0x6265
        if (buffer.readUInt32BE(0) !== 0x2e637475 || buffer.readUInt16BE(4) !== 0x6265) {
            throw new Error('Invalid format');
        }

        // Bolt Optimization: zero-copy .subarray() avoids temporary buffer copy or string encoding overhead
        const signature = buffer.subarray(HEADER_LENGTH, HEADER_LENGTH + SIGNATURE_LENGTH);
        const payloadBuf = buffer.subarray(HEADER_LENGTH + SIGNATURE_LENGTH);

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payloadBuf);
        const expectedSignature = hmac.digest();

        if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        // Standard standard-compliant parsing via toString('utf8')
        const payloadStr = payloadBuf.toString('utf8');
        try {
            return JSON.parse(payloadStr);
        } catch {
            throw new Error('Invalid JSON payload');
        }
    }
}
