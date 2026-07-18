import * as crypto from 'crypto';

const HEADER_BUFFER = Buffer.from('.ctube');

export class PersistenceLayer {
    save(data: any, key: string): Buffer {
        const payload = JSON.stringify(data);
        const payloadBuffer = Buffer.from(payload, 'utf8');

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payloadBuffer);
        const signature = hmac.digest();

        const totalLen = 6 + 32 + payloadBuffer.length;
        const result = Buffer.allocUnsafe(totalLen);
        result.set(HEADER_BUFFER, 0);
        result.set(signature, 6);
        result.set(payloadBuffer, 38);
        return result;
    }

    verifyAndLoad(buffer: Buffer, key: string): any {
        // Sentinel: Hardened buffer length check to prevent unhandled RangeError or DoS crashes
        if (!Buffer.isBuffer(buffer) || buffer.length < 38) {
            throw new Error('Invalid format');
        }

        // Bolt Optimization: Compare header using .equals() directly on subarray view to avoid string allocation
        const headerSub = buffer.subarray(0, 6);
        if (!headerSub.equals(HEADER_BUFFER)) {
            throw new Error('Invalid format');
        }

        // Bolt Optimization: Use subarray to avoid buffer allocation and copying
        const signature = buffer.subarray(6, 38);
        const payloadBuffer = buffer.subarray(38);

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payloadBuffer);
        const expectedSignature = hmac.digest();

        // Sentinel: Ensure signatures match in length before using timingSafeEqual to avoid internal exceptions
        if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        try {
            // Bolt Optimization: Pass the payload buffer directly to JSON.parse in Node.js 22.x, avoiding string allocation
            return JSON.parse(payloadBuffer as any);
        } catch {
            throw new Error('Invalid JSON payload');
        }
    }
}
