import request from 'supertest';
import { app, sessionCache, redisClient } from '../src/server';
import { getBlindedRedisKey } from '../src/session_rotator';

jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    expire: jest.fn().mockResolvedValue(true),
    quit: jest.fn().mockResolvedValue('OK'),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe('Session Token DoS Prevention and Normalization', () => {
  let redisMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionCache.clear();
    const { createClient } = require('redis');
    redisMock = createClient();
  });

  it('should reject x-session-token that exceeds 256 characters', async () => {
    const longToken = 'a'.repeat(257);
    const res = await request(app)
      .get('/mcp/check')
      .set('x-user-id', 'test-user')
      .set('x-session-token', longToken);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid x-session-token: exceeds maximum length');
  });

  it('should normalize x-session-token by trimming whitespace', async () => {
    const token = '  valid-token-uuid  ';
    const trimmedToken = 'valid-token-uuid';
    const expectedRedisKey = getBlindedRedisKey(trimmedToken);

    // Mock redis to return the user ONLY for the trimmed token key
    redisMock.get.mockImplementation((key: string) => {
       if (key === expectedRedisKey) return Promise.resolve('test-user');
       return Promise.resolve(null);
    });

    const res = await request(app)
      .get('/mcp/check')
      .set('x-user-id', 'test-user')
      .set('x-session-token', token);

    // If normalization works, it should succeed
    expect(res.status).toBe(200);
  });
});
