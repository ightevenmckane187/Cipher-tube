/* eslint-disable @typescript-eslint/no-explicit-any */
import * as crypto from 'crypto';

const HEADER_BUF = Buffer.from('.ctube');

export class PersistenceLayer {
    save(data: any, key: string): Buffer {
        const payload = JSON.stringify(data);
        const payloadBuf = Buffer.from(payload, 'utf8');

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payloadBuf);
        const signature = hmac.digest();

        // Bolt Optimization: Allocate unsafe buffer and manually write segments to avoid Buffer.concat overhead.
        const out = Buffer.allocUnsafe(38 + payloadBuf.length);
        out.set(HEADER_BUF, 0);
        out.set(signature, 6);
        out.set(payloadBuf, 38);
        return out;
    }

    verifyAndLoad(buffer: Buffer, key: string): any {
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('Input must be a Buffer');
        }
        if (buffer.length < 38) {
            throw new Error('Invalid format');
        }

        // Bolt Optimization: Direct memory segment comparison instead of string conversion for header.
        if (buffer.compare(HEADER_BUF, 0, 6, 0, 6) !== 0) {
            throw new Error('Invalid format');
        }

        // Bolt Optimization: Use subarray views for signature and payload to avoid intermediate allocations.
        const signature = buffer.subarray(6, 38);
        const payloadSub = buffer.subarray(38);

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payloadSub);
        const expectedSignature = hmac.digest();

        if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        // Bolt Optimization: Decode directly from offset 38.
        const payloadStr = buffer.toString('utf8', 38);
        try {
            return JSON.parse(payloadStr);
        } catch {
            throw new Error('Invalid JSON payload');
        }
    }
}
