import request from 'supertest';
import { app } from '../src/server';

// Mock Redis client
jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
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

    // Check for some common helmet headers
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['strict-transport-security']).toBeDefined();
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
    const userId = 'u1';
    const other = 'u2';

    // Create session
    const create = await request(app).post('/mcp').set('x-user-id', userId);
    const sid = create.body.sessionId;
    expect(sid).toBeDefined();

    // Mock redis for subsequent check
    redisMock.get.mockResolvedValueOnce(userId);

    const checkOk = await request(app).get(`/mcp/${sid}/check`).set('x-user-id', userId);
    expect(checkOk.status).toBe(200);

    // Mock redis for fail check
    redisMock.get.mockResolvedValueOnce(userId);
    const checkFail = await request(app).get(`/mcp/${sid}/check`).set('x-user-id', other);
    expect(checkFail.status).toBe(403);

    const checkInvalid = await request(app).get('/mcp/bad/check').set('x-user-id', userId);
    expect(checkInvalid.status).toBe(400);
  });

  it('should reject large JSON payloads', async () => {
    // Create a payload larger than 10kb
    const largePayload = {
      data: 'a'.repeat(11 * 1024)
    };

    const response = await request(app)
      .post('/mcp') // Route with JSON parser
      .set('x-user-id', 'test-user')
      .send(largePayload);

    expect(response.status).toBe(413);
  });
});
