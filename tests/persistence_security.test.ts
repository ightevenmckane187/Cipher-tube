/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto';
import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';

describe('PersistenceLayer Security Hardening', () => {
  let persistence: PersistenceLayer;
  const key = 'secure-sovereign-key-123';

  beforeEach(() => {
    persistence = new PersistenceLayer();
  });

  it('should safely reject non-Buffer inputs', () => {
    expect(() => {
      persistence.verifyAndLoad('not-a-buffer' as any, key);
    }).toThrow('Input must be a Buffer');

    expect(() => {
      persistence.verifyAndLoad({} as any, key);
    }).toThrow('Input must be a Buffer');

    expect(() => {
      persistence.verifyAndLoad(null as any, key);
    }).toThrow('Input must be a Buffer');
  });

  it('should safely reject buffers that are too short to contain header and signature', () => {
    const tooShort = Buffer.from('.ctube'); // 6 bytes
    expect(() => {
      persistence.verifyAndLoad(tooShort, key);
    }).toThrow('Invalid format');
  });

  it('should prevent timingSafeEqual length mismatch crashes by validating signature length via buffer length guard', () => {
    // Header .ctube followed by 10 bytes signature and 21 bytes payload. Total length = 37 bytes.
    // If we didn't have the buffer.length < 38 guard, signature would be 31 bytes, causing timingSafeEqual to throw.
    const malformedBuffer = Buffer.concat([
      Buffer.from('.ctube'),
      Buffer.alloc(10),
      Buffer.from(JSON.stringify({ state: 'sovereign' }))
    ]);

    expect(() => {
      persistence.verifyAndLoad(malformedBuffer, key);
    }).toThrow('Invalid format');

    // Ensure it doesn't throw a RangeError or TypeError about timingSafeEqual buffer lengths
    try {
      persistence.verifyAndLoad(malformedBuffer, key);
    } catch (e: any) {
      expect(e.message).toBe('Invalid format');
      expect(e.name).not.toBe('RangeError');
      expect(e.name).not.toBe('TypeError');
    }
  });

  it('should safely handle malformed JSON inside valid-signature payload', () => {
    // Generate valid signature but invalid JSON payload
    const malformedPayload = '{ state: malformed ';
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(malformedPayload);
    const signature = hmac.digest();

    const buffer = Buffer.concat([
      Buffer.from('.ctube'),
      signature,
      Buffer.from(malformedPayload)
    ]);

    expect(() => {
      persistence.verifyAndLoad(buffer, key);
    }).toThrow('Invalid JSON payload');
  });

  it('should successfully save and load valid objects', () => {
    const originalData = { secure: true, val: 42 };
    const saved = persistence.save(originalData, key);
    const loaded = persistence.verifyAndLoad(saved, key);
    expect(loaded).toEqual(originalData);
  });
});
