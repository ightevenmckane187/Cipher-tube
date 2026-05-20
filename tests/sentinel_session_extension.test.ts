import request from 'supertest';
import { app } from '../src/server';
import { createClient } from 'redis';

// Mock Redis client
jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    expire: jest.fn().mockResolvedValue(true),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe('Sentinel: Session Extension and Activity Refresh', () => {
  let redisMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock = (createClient as jest.Mock)();
  });

  it('should extend session via POST /session/:sessionId/extend', async () => {
    const userId = 'test-user';
    const sessionId = '550e8400-e29b-41d4-a716-446655440000';

    redisMock.get.mockResolvedValue(userId);

    const response = await request(app)
      .post(`/session/${sessionId}/extend`)
      .set('x-user-id', userId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Session successfully extended",
      status: "extended"
    });

    // Verify expire was called (Activity Refresh)
    expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
  });

  it('should trigger Activity Refresh on regular check', async () => {
    const userId = 'test-user';
    const sessionId = '550e8400-e29b-41d4-a716-446655440000';

    redisMock.get.mockResolvedValue(userId);

    const response = await request(app)
      .get(`/mcp/${sessionId}/check`)
      .set('x-user-id', userId);

    expect(response.status).toBe(200);
    expect(redisMock.expire).toHaveBeenCalledWith(`session:${sessionId}:owner`, 3600);
  });

  it('should not extend session if not the owner', async () => {
    const ownerId = 'owner';
    const attackerId = 'attacker';
    const sessionId = '550e8400-e29b-41d4-a716-446655440000';

    redisMock.get.mockResolvedValue(ownerId);

    const response = await request(app)
      .post(`/session/${sessionId}/extend`)
      .set('x-user-id', attackerId);

    expect(response.status).toBe(403);
    expect(redisMock.expire).not.toHaveBeenCalled();
  });
});
