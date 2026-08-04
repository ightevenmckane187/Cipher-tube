/* eslint-disable @typescript-eslint/no-explicit-any */
import * as crypto from 'crypto';

// Bolt Optimization: Hoisting static header as module-scope constant to prevent redundant allocation
const HEADER_BUF = Buffer.from('.ctube');

export class PersistenceLayer {
    save(data: any, key: string): Buffer {
        const payload = JSON.stringify(data);
        const payloadBuf = Buffer.from(payload, 'utf8');

        // Bolt Optimization: Allocate unsafe buffer for exact combined size to avoid Buffer.concat and intermediate payload allocations
        const outBuf = Buffer.allocUnsafe(38 + payloadBuf.length);

        // Copy pre-allocated header and payload
        outBuf.set(HEADER_BUF, 0);
        outBuf.set(payloadBuf, 38);

        // Compute and write HMAC signature directly
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payloadBuf);
        const signature = hmac.digest();
        outBuf.set(signature, 6);

        return outBuf;
    }

    verifyAndLoad(buffer: Buffer, key: string): any {
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('Input must be a Buffer');
        }
        if (buffer.length < 38) {
            throw new Error('Invalid format');
        }

        // Bolt Optimization: Direct binary check for '.ctube' header to avoid any string allocation/decoding
        if (buffer.readUInt32BE(0) !== 0x2e637475 || buffer.readUInt16BE(4) !== 0x6265) {
            throw new Error('Invalid format');
        }

        // Bolt Optimization: Use .subarray() instead of .slice() to create zero-copy Buffer views
        const signature = buffer.subarray(6, 38);
        const payloadView = buffer.subarray(38);

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payloadView); // Direct buffer updates avoid payload string extraction overhead
        const expectedSignature = hmac.digest();

        // Constant-time signature verification
        if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        // Decode payload only after signature validation passes to optimize failure paths and save CPU cycles
        const payloadStr = buffer.toString('utf8', 38);
        try {
            return JSON.parse(payloadStr);
        } catch {
            throw new Error('Invalid JSON payload');
        }
    }
}
