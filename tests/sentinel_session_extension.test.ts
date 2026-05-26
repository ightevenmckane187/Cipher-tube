import request from 'supertest';
import { app, redisClient, sessionCache } from '../src/server';

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

describe('Sentinel: Session Extension and Activity Refresh', () => {
  const userId = 'user-123';
  const otherUserId = 'user-456';
  const sessionId = '550e8400-e29b-41d4-8716-446655440000';
  let redisMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionCache.clear();
    const { createClient } = require('redis');
    redisMock = createClient();

    // Default mock behavior
    redisMock.get.mockImplementation((key: string) => {
      if (key === `session:${sessionId}:owner`) return Promise.resolve(userId);
      return Promise.resolve(null);
    });
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  it('should extend session TTL on successful check (cache miss)', async () => {
    const res = await request(app)
      .get(`/mcp/${sessionId}/check`)
      .set('x-user-id', userId);

    expect(res.status).toBe(200);
    expect(redisMock.get).toHaveBeenCalledWith(`session:${sessionId}:owner`);
    expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
  });

  it('should extend session TTL on successful check (cache hit)', async () => {
    // Pre-warm cache
    sessionCache.set(sessionId, userId);

    const res = await request(app)
      .get(`/mcp/${sessionId}/check`)
      .set('x-user-id', userId);

    expect(res.status).toBe(200);
    expect(redisMock.get).not.toHaveBeenCalled();
    expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
  });

  it('should provide an explicit extension endpoint', async () => {
    const res = await request(app)
      .post(`/session/${sessionId}/extend`)
      .set('x-user-id', userId);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Session extended successfully');
    expect(res.body).toHaveProperty('expiresIn', 3600);
    expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
  });

  it('should not extend session if user is not the owner', async () => {
    const res = await request(app)
      .post(`/session/${sessionId}/extend`)
      .set('x-user-id', otherUserId);

    expect(res.status).toBe(403);
    expect(redisMock.expire).not.toHaveBeenCalled();
  });

  it('should handle redis errors gracefully during extension', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    redisMock.expire.mockRejectedValueOnce(new Error('Redis connection lost'));

    const res = await request(app)
      .get(`/mcp/${sessionId}/check`)
      .set('x-user-id', userId);

    expect(res.status).toBe(200); // Still succeeds even if TTL extension fails
    expect(consoleSpy).toHaveBeenCalledWith('Failed to extend session TTL:', 'Redis connection lost');
    consoleSpy.mockRestore();
  });
});
