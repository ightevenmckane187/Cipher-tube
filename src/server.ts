import express from 'express';
import { createClient } from 'redis';
import helmet from 'helmet';
import rateLimit, { Options } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
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

// Redis-backed rate limiting to prevent DoS attacks and avoid memory leaks
const limiterOptions: Partial<Options> = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
};

if (process.env.NODE_ENV !== 'test') {
    limiterOptions.store = new RedisStore({
        // @ts-ignore - redisClient type mismatch between libraries
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    });
}

const limiter = rateLimit(limiterOptions);
app.use(limiter);

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
