import express from 'express';
import { createClient } from 'redis';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Basic error handling for Redis connection
redisClient.on('error', (err) => {
    // Only log essential info to avoid leaking credentials in the URL
    console.error('Redis Client Error:', err.message);
});

// Security Enhancements
app.use(helmet()); // Sets various security-related HTTP headers
app.disable('x-powered-by'); // Further ensures the header is removed

/**
 * Redis-backed Rate Limiter to protect against DoS attacks.
 * Uses INCR and EXPIRE to track requests per IP within a 15-minute window.
 */
const rateLimiter = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || 'unknown';
    const key = `rate_limit:${ip}`;
    const limit = 100;
    const windowSeconds = 15 * 60; // 15 minutes

    try {
        const currentRequests = await redisClient.incr(key);
        if (currentRequests === 1) {
            await redisClient.expire(key, windowSeconds);
        }

        if (currentRequests > limit) {
            return res.status(429).json({ error: 'Too many requests, please try again later.' });
        }
        next();
    } catch (err) {
        // Fail securely: allow requests if Redis is unavailable, but log the issue
        console.error('Rate limiter error:', (err as Error).message);
        next();
    }
};

app.use(rateLimiter);

// Limit JSON payload size to prevent DoS attacks
app.use(express.json({ limit: '10kb' }));

// Use a mock for testing as per memory instructions
if (process.env.NODE_ENV !== 'test') {
    redisClient.connect().catch(console.error);
}

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export app for testing
export { app, redisClient };

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Cipher-tube server running on port ${PORT}`);
    });
}
