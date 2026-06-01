import request from 'supertest';
import { app, sessionCache } from '../src/server';
import { createClient } from 'redis';

// Mock Redis client
jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    expire: jest.fn().mockResolvedValue(1),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe('Sentinel: Session Extension & Activity Refresh', () => {
  let redisMock: any;
  const sessionId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = 'test-user';

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock = (createClient as jest.Mock)();
    sessionCache.clear();
  });

  it('POST /session/:sessionId/extend should extend session TTL', async () => {
    redisMock.get.mockResolvedValue(userId);

    const response = await request(app)
      .post(`/session/${sessionId}/extend`)
      .set('x-user-id', userId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Session extended', expiresIn: 3600 });
    expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
  });

  it('ensureSessionOwner should trigger activity refresh on lookup', async () => {
    redisMock.get.mockResolvedValue(userId);

    const response = await request(app)
      .get(`/mcp/${sessionId}/check`)
      .set('x-user-id', userId);

    expect(response.status).toBe(200);
    expect(redisMock.get).toHaveBeenCalledWith(`session:${sessionId}:owner`);
    expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
  });

  it('ensureSessionOwner should trigger activity refresh even on cache hit', async () => {
    // Pre-warm cache
    sessionCache.set(sessionId, userId);

    const response = await request(app)
      .get(`/mcp/${sessionId}/check`)
      .set('x-user-id', userId);

    expect(response.status).toBe(200);
    expect(redisMock.get).not.toHaveBeenCalled();
    expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
  });

  it('POST /session/:sessionId/extend should return 403 if not owner', async () => {
    redisMock.get.mockResolvedValue('different-user');

    const response = await request(app)
      .post(`/session/${sessionId}/extend`)
      .set('x-user-id', userId);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Forbidden');
  });
});
