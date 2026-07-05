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

describe('Gateway Security Hardening Verification', () => {
  it('should have security headers (Helmet)', async () => {
    const response = await request(app).get('/404');

    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should not have x-powered-by header', async () => {
    const response = await request(app).get('/404');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('should have Permissions-Policy header', async () => {
    const response = await request(app).get('/404');
    expect(response.headers['permissions-policy']).toBeDefined();
    expect(response.headers['permissions-policy']).toContain('geolocation=()');
  });

  it('should apply no-cache headers to /system/analytics', async () => {
    const { cache } = require('../src/cache/redisPool');
    cache.get.mockResolvedValue(JSON.stringify({ identitySecured: true, originEpoch: Date.now() }));

    const response = await request(app)
      .get('/system/analytics')
      .set('x-cipher-hash', 'some-hash')
      .set('x-cipher-proof', 'some-proof');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.headers['cache-control']).toContain('no-cache');
    expect(response.headers['cache-control']).toContain('must-revalidate');
  });

  it('should include rate limit headers', async () => {
    const response = await request(app).get('/404');
    expect(response.headers['ratelimit-limit']).toBe('1000');
  });
});
