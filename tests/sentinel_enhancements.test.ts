import request from 'supertest';
import { app } from '../src/server';

// Mock Redis client to prevent connection errors during tests
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

describe('Sentinel Security Enhancement: JSON 404', () => {
  it('should return JSON 404 for unknown routes', async () => {
    const response = await request(app).get('/unknown-route-for-testing-404');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toEqual({ error: 'Not Found' });
  });

  it('should return JSON 404 for unknown POST routes', async () => {
    const response = await request(app).post('/unknown-post-route').send({ data: 'test' });

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toEqual({ error: 'Not Found' });
  });
});
