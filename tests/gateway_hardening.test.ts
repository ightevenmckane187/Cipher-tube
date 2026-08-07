import request from 'supertest';
import { app } from '../src/gatewayServer';

// Mock Redis to avoid connection issues
jest.mock('../src/cache/redisPool', () => ({
  cache: {
    get: jest.fn(),
    setEx: jest.fn(),
    expire: jest.fn(),
    rawClient: {
        isOpen: true,
        quit: jest.fn()
    }
  }
}));

// Mock cryptographic proof verification
jest.mock('../src/crypto/verifier', () => ({
  verifyCryptographicProof: jest.fn().mockResolvedValue(true)
}));

describe('Gateway Security Hardening', () => {
  it('should have standard security headers', async () => {
    const response = await request(app).get('/non-existent');

    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['permissions-policy']).toBeDefined();
  });

  it('should have rate limiting headers', async () => {
    const response = await request(app).get('/system/analytics');

    // express-rate-limit with standardHeaders: true sets RateLimit-* headers
    expect(response.headers['ratelimit-limit']).toBeDefined();
  });

  it('should have no-cache headers on analytics endpoint', async () => {
    const response = await request(app)
      .get('/system/analytics')
      .set('x-cipher-proof', 'valid-proof')
      .set('x-cipher-hash', 'valid-hash');

    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.headers['cache-control']).toContain('no-cache');
    expect(response.headers['pragma']).toBe('no-cache');
  });
});
