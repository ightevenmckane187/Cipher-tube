import request from 'supertest';
import { app } from '../src/server';

// Mock express-rate-limit to trigger the handler
jest.mock('express-rate-limit', () => {
  return jest.fn((options) => {
    // Return a middleware that immediately calls the handler if it's the second request
    let count = 0;
    return (req: any, res: any, next: any) => {
      count++;
      if (count > 1) {
        if (options.handler) {
          return options.handler(req, res, next);
        }
        return res.status(429).send('Too many requests');
      }
      next();
    };
  });
});

// Mock Redis client to prevent connection issues
jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue('test-user'),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe('Sentinel Rate Limit JSON Response', () => {
  it('should return 429 with JSON error message when rate limit is exceeded', async () => {
    // First request should pass
    await request(app)
      .get('/')
      .expect(200);

    // Second request should trigger the mocked rate limit handler
    const response = await request(app)
      .get('/')
      .expect(429);

    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual({
      error: 'Too many requests from this IP, please try again later.'
    });
  });
});
