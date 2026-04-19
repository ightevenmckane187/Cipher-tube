jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    incr: jest.fn(),
    expire: jest.fn(),
  }),
}));

import request from 'supertest';
import { app, redisClient } from '../src/server';

describe('Server Security and Health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have security headers from helmet', async () => {
    (redisClient.incr as jest.Mock).mockResolvedValue(1);
    const response = await request(app).get('/health');

    // Check for some common helmet headers
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['strict-transport-security']).toBeDefined();
  });

  it('should NOT have x-powered-by header', async () => {
    (redisClient.incr as jest.Mock).mockResolvedValue(1);
    const response = await request(app).get('/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('should return ok from /health', async () => {
    (redisClient.incr as jest.Mock).mockResolvedValue(1);
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('should reject large JSON payloads', async () => {
    (redisClient.incr as jest.Mock).mockResolvedValue(1);
    // Create a payload larger than 10kb
    const largePayload = {
      data: 'a'.repeat(11 * 1024)
    };

    const response = await request(app)
      .post('/health') // Route doesn't matter, middleware hits first
      .send(largePayload);

    expect(response.status).toBe(413);
  });

  it('should return 429 after exceeding rate limit', async () => {
    (redisClient.incr as jest.Mock).mockResolvedValue(101);

    const response = await request(app).get('/health');

    expect(response.status).toBe(429);
    expect(response.body.error).toMatch(/Too many requests/);

    // Verify security headers are present even in 429 responses
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});
