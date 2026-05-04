import request from 'supertest';
import { app } from '../src/server';

describe('Sentinel Rate Limit Verification', () => {
    it('should return 429 JSON response when limit exceeded (manual trigger)', async () => {
        // sessionLimiter has a limit of 100.
        // We will hit it 101 times to trigger the 429 response.

        // Use a for loop with awaits to avoid overloading the event loop and potential race conditions
        let rateLimitedResponse: any = null;
        for (let i = 0; i < 110; i++) {
            const response = await request(app)
                .post('/mcp')
                .set('x-user-id', 'test-user-' + i); // Unique user ID just in case

            if (response.status === 429) {
                rateLimitedResponse = response;
                break;
            }
        }

        expect(rateLimitedResponse).not.toBeNull();
        if (rateLimitedResponse) {
            expect(rateLimitedResponse.status).toBe(429);
            expect(rateLimitedResponse.body).toEqual({ error: 'Too many requests, please try again later.' });
            expect(rateLimitedResponse.headers['content-type']).toMatch(/json/);
        }
    }, 30000); // Increase timeout for many requests
});
