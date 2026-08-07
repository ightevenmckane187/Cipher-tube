/* eslint-disable @typescript-eslint/no-explicit-any */
import * as crypto from 'crypto';

const HEADER_BUF = Buffer.from('.ctube');
const HEADER_LEN = 6;
const SIGNATURE_LEN = 32;
const MIN_LEN = HEADER_LEN + SIGNATURE_LEN;

export class PersistenceLayer {
    save(data: any, key: string): Buffer {
        const payloadStr = JSON.stringify(data);
        const payloadLen = Buffer.byteLength(payloadStr, 'utf8');
        const output = Buffer.allocUnsafe(MIN_LEN + payloadLen);

        output.set(HEADER_BUF, 0);
        output.write(payloadStr, MIN_LEN, payloadLen, 'utf8');

        const payloadView = output.subarray(MIN_LEN);
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payloadView);
        const signature = hmac.digest();

        output.set(signature, HEADER_LEN);
        return output;
    }

    verifyAndLoad(buffer: Buffer, key: string): any {
        if (!Buffer.isBuffer(buffer)) {
            throw new Error('Input must be a Buffer');
        }
        if (buffer.length < MIN_LEN) {
            throw new Error('Invalid format');
        }

        // Direct byte check for '.ctube' to avoid string allocation
        if (
            buffer[0] !== 0x2e || // '.'
            buffer[1] !== 0x63 || // 'c'
            buffer[2] !== 0x74 || // 't'
            buffer[3] !== 0x75 || // 'u'
            buffer[4] !== 0x62 || // 'b'
            buffer[5] !== 0x65    // 'e'
        ) {
            throw new Error('Invalid format');
        }

        const signature = buffer.subarray(HEADER_LEN, MIN_LEN);
        const payloadView = buffer.subarray(MIN_LEN);

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payloadView);
        const expectedSignature = hmac.digest();

        if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        try {
            return JSON.parse(payloadView.toString('utf8'));
        } catch {
            throw new Error('Invalid JSON payload');
        }
    }
}
