import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

describe('PersistenceLayer DoS Fix Verification', () => {
    const pl = new PersistenceLayer();
    const key = 'test-key';

    it('should throw handled Error when buffer is too short', () => {
        const malformedBuffer = Buffer.from('.ctube1234');

        expect(() => {
            pl.verifyAndLoad(malformedBuffer, key);
        }).toThrow('Invalid format: Buffer too short');
    });

    it('should throw handled Error when header is wrong', () => {
        const malformedBuffer = Buffer.alloc(40);
        malformedBuffer.write('WRONGH');

        expect(() => {
            pl.verifyAndLoad(malformedBuffer, key);
        }).toThrow('Invalid format: Header mismatch');
    });

    it('should throw diagnostic Error when payload is malformed JSON', () => {
        const payload = '{invalid-json';
        const hmac = require('crypto').createHmac('sha256', key);
        hmac.update(payload);
        const signature = hmac.digest();
        const bufferWithInvalidJson = Buffer.concat([Buffer.from('.ctube'), signature, Buffer.from(payload)]);

        expect(() => {
            pl.verifyAndLoad(bufferWithInvalidJson, key);
        }).toThrow('Invalid or malformed persistent state payload');
    });

    it('should still work for valid payloads', () => {
        const data = { sovereign: true, level: 9001 };
        const saved = pl.save(data, key);
        const loaded = pl.verifyAndLoad(saved, key);
        expect(loaded).toEqual(data);
    });
});
