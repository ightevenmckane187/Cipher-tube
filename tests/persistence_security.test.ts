/* eslint-disable @typescript-eslint/no-explicit-any */
import { PersistenceLayer } from '../src/os/persistence/PersistenceLayer';
import crypto from 'crypto';

describe('PersistenceLayer Security Hardening', () => {
  let persistence: PersistenceLayer;
  const testKey = 'test-sovereign-key';

  beforeEach(() => {
    persistence = new PersistenceLayer();
  });

  it('should safely throw error when input is not a Buffer', () => {
    expect(() => {
      persistence.verifyAndLoad('not-a-buffer' as any, testKey);
    }).toThrow('Input must be a Buffer');
  });

  it('should safely throw error when buffer is too short (less than 38 bytes)', () => {
    const tooShortBuffer = Buffer.from('.ctube-short');
    expect(() => {
      persistence.verifyAndLoad(tooShortBuffer, testKey);
    }).toThrow('Invalid format');
  });

  it('should safely throw error on header mismatch', () => {
    const data = { test: 'data' };
    const validBuf = persistence.save(data, testKey);
    // Tamper with the header
    validBuf.write('badhdr', 0, 6);

    expect(() => {
      persistence.verifyAndLoad(validBuf, testKey);
    }).toThrow('Invalid format');
  });

  it('should safely throw error on signature mismatch without RangeError or unhandled exceptions', () => {
    const data = { test: 'data' };
    const validBuf = persistence.save(data, testKey);
    // Tamper with one byte of the signature
    validBuf[10] ^= 0xff;

    expect(() => {
      persistence.verifyAndLoad(validBuf, testKey);
    }).toThrow('Integrity check failed');
  });

  it('should safely throw error on malformed JSON payload', () => {
    // Manually construct a buffer with valid header, valid signature for malformed JSON, and malformed JSON payload.
    const malformedPayload = '{"invalid": json';
    const hmac = crypto.createHmac('sha256', testKey);
    hmac.update(malformedPayload);
    const signature = hmac.digest();

    const header = Buffer.from('.ctube');
    const buffer = Buffer.concat([header, signature, Buffer.from(malformedPayload)]);

    expect(() => {
      persistence.verifyAndLoad(buffer, testKey);
    }).toThrow('Invalid JSON payload');
  });

  it('should correctly save and verify a valid payload', () => {
    const data = { secure: true, level: 42 };
    const buffer = persistence.save(data, testKey);
    const loaded = persistence.verifyAndLoad(buffer, testKey);

    expect(loaded).toEqual(data);
  });
});
