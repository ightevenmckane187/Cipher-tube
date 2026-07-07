
import * as crypto from 'crypto';

export class PersistenceLayer {
    save(data: any, key: string): Buffer {
        const payload = JSON.stringify(data);
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const signature = hmac.digest();

        const header = Buffer.from('.ctube');
        return Buffer.concat([header, signature, Buffer.from(payload)]);
    }

    verifyAndLoad(buffer: Buffer, key: string): any {
        const header = buffer.slice(0, 6).toString();
        if (header !== '.ctube') throw new Error('Invalid format');

        const signature = buffer.slice(6, 38);
        const payload = buffer.slice(38).toString();

        const hmac = crypto.createHmac('sha256', key);
        hmac.update(payload);
        const expectedSignature = hmac.digest();

        if (!crypto.timingSafeEqual(signature, expectedSignature)) {
            throw new Error('Integrity check failed');
        }

        return JSON.parse(payload);
    }
}
