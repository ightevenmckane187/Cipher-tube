import request from 'supertest';
import { app } from '../src/server';
import { createClient } from 'redis';

// Mock Redis client
jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
    get: jest.fn(),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe('Security Validation', () => {
  let redisMock: any;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock = (createClient as jest.Mock)();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('x-user-id validation', () => {
    it('should reject x-user-id longer than 128 characters in POST /mcp', async () => {
      const longUserId = 'a'.repeat(129);
      const response = await request(app)
        .post('/mcp')
        .set('x-user-id', longUserId);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid x-user-id');
    });

    it('should reject x-user-id longer than 128 characters in GET /mcp/:sessionId/check', async () => {
      const longUserId = 'a'.repeat(129);
      const sessionId = '550e8400-e29b-41d4-8716-446655440000';
      const response = await request(app)
        .get(`/mcp/${sessionId}/check`)
        .set('x-user-id', longUserId);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid x-user-id');
    });

  });

  describe('Sanitized Error Logging', () => {
    it('should log only err.message on Redis failure in POST /mcp', async () => {
      const complexError = new Error('Redis connection failed');
      (complexError as any).sensitiveInfo = 'secret-password-123';

      redisMock.set.mockRejectedValueOnce(complexError);

      await request(app)
        .post('/mcp')
        .set('x-user-id', 'user123');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Session creation failed:'),
        'Redis connection failed'
      );

      // Ensure the full error object (which might contain sensitive info) wasn't logged
      const loggedArgs = consoleSpy.mock.calls[0];
      expect(loggedArgs).not.toContain(complexError);
    });

    it('should log only err.message on Redis failure in ensureSessionOwner', async () => {
      const complexError = new Error('Redis get failed');
      (complexError as any).sensitiveInfo = 'secret-password-456';

      redisMock.get.mockRejectedValueOnce(complexError);
      const sessionId = '550e8400-e29b-41d4-8716-446655440000';

      await request(app)
        .get(`/mcp/${sessionId}/check`)
        .set('x-user-id', 'user123');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Session ownership check failed:'),
        'Redis get failed'
      );
    });
  });
});
