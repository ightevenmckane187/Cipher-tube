import request from 'supertest';
import { app } from '../src/server';

describe('Middleware Order Verification', () => {
  it('should have security headers on 429 responses', async () => {
    // Trigger rate limit on apiLimiter (limit is 1000, so we might need a lot of requests)
    // Actually, we can just check if helmet is after apiLimiter in the source.
    // Or we can mock rateLimit to trigger immediately.

    // Instead of hitting the real rate limit, let's just observe the middleware order in src/server.ts
    // Global middleware:
    // app.use(apiLimiter) is at line 55
    // app.use(helmet) is at line 60

    // This confirms that if apiLimiter triggers, helmet hasn't run yet.

    const sessionId = '550e8400-e29b-41d4-4716-446655440000';
    for (let i = 0; i < 100; i++) {
        await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', 'user-id');
    }

    const response = await request(app)
        .get(`/mcp/${sessionId}/check`)
        .set('x-user-id', 'user-id');

    expect(response.status).toBe(429);
    // If helmet is AFTER apiLimiter, these headers might be missing on 429
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  }, 20000);
});
