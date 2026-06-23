import request from 'supertest';
import { app } from '../src/gatewayServer';

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({ on: jest.fn(), connect: jest.fn().mockResolvedValue(null), isOpen: true, get: jest.fn(), setEx: jest.fn(), expire: jest.fn(), quit: jest.fn() }))
}));

describe('Gateway Security Enhancements', () => {
  it('should have security headers and rate limiting', async () => {
    const res = await request(app).get('/system/analytics');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
