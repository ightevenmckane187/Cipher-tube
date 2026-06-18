import request from 'supertest';
import { app } from '../src/server';

// Mock Redis client
jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

import { createClient } from 'redis';

describe('Server Security and Health', () => {
  let redisMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock = (createClient as jest.Mock)();
  });

  it('should have security headers from helmet', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    expect(response.headers['strict-transport-security']).toContain('includeSubDomains');
    expect(response.headers['strict-transport-security']).toContain('preload');
    expect(response.headers['content-security-policy']).toContain("base-uri 'none'");
    expect(response.headers['content-security-policy']).toContain("form-action 'self'");
    expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });

  it('should NOT have x-powered-by header', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('should return ok from /health', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('should verify session ownership', async () => {
    const userId = 'user-owner';
    const other = 'user-other';

    redisMock.get.mockResolvedValue(userId);

    const create = await request(app).post('/session').set('x-user-id', userId);
    const sid = create.body.sessionId;
    expect(sid).toBeDefined();

    // Mock redis for subsequent check
    redisMock.get.mockResolvedValueOnce(userId);

    redisMock.get.mockResolvedValue(userId);
    const checkOk = await request(app).get(`/session/${sid}/check`).set('x-user-id', userId);
    expect(checkOk.status).toBe(200);

    // Mock redis for fail check
    redisMock.get.mockResolvedValueOnce(userId);
    const checkFail = await request(app).get(`/session/${sid}/check`).set('x-user-id', other);
    expect(checkFail.status).toBe(403);

    const checkInvalid = await request(app).get('/session/bad/check').set('x-user-id', userId);
    expect(checkInvalid.status).toBe(400);
  });

  it('should reject large JSON payloads', async () => {
    const largePayload = {
      data: 'a'.repeat(11 * 1024)
    };
    const response = await request(app)
      .post('/session')
      .set('x-user-id', 'test-user')
      .send(largePayload);
    expect(response.status).toBe(413);
  });
});
