import request from 'supertest';
import { app, redisClient, sessionCache } from '../src/server';

jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    expire: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe('Sentinel: Session Extension & Sliding Window', () => {
  const userId = 'test-user';
  const sessionId = '550e8400-e29b-41d4-8716-446655440001';
  let redisMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionCache.clear();
    const { createClient } = require('redis');
    redisMock = createClient();
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  it('should extend session via POST /session/:sessionId/extend', async () => {
    redisMock.get.mockResolvedValueOnce(userId);

    const res = await request(app)
      .post(`/session/${sessionId}/extend`)
      .set('x-user-id', userId);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: 'Session extended',
      expiresIn: 3600,
    });

    expect(redisMock.expire).toHaveBeenCalledWith(
      `session:${sessionId}:owner`,
      3600
    );
  });

  it('should refresh activity (sliding session) on GET /mcp/:sessionId/check', async () => {
    redisMock.get.mockResolvedValueOnce(userId);

    const res = await request(app)
      .get(`/mcp/${sessionId}/check`)
      .set('x-user-id', userId);

    expect(res.status).toBe(200);
    expect(redisMock.expire).toHaveBeenCalledWith(
      `session:${sessionId}:owner`,
      3600
    );
  });

  it('should refresh activity (sliding session) even on cache hits', async () => {
    // Pre-warm cache
    sessionCache.set(sessionId, userId);

    const res = await request(app)
      .get(`/mcp/${sessionId}/check`)
      .set('x-user-id', userId);

    expect(res.status).toBe(200);
    expect(redisMock.get).not.toHaveBeenCalled();
    expect(redisMock.expire).toHaveBeenCalledWith(
      `session:${sessionId}:owner`,
      3600
    );
  });

  it('should not extend session if user does not own it', async () => {
    redisMock.get.mockResolvedValueOnce('different-user');

    const res = await request(app)
      .post(`/session/${sessionId}/extend`)
      .set('x-user-id', userId);

    expect(res.status).toBe(403);
    expect(redisMock.expire).not.toHaveBeenCalled();
  });
});
