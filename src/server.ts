import express from 'express';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3232;
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

redisClient.connect().catch(console.error);

app.use(express.json());

const mcpRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

// Middleware to ensure session owner
export const ensureSessionOwner = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userId = req.headers['x-user-id'] as string;
    const { sessionId } = req.params;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: User ID missing' });
    }

    if (!sessionId) {
        return res.status(400).json({ error: 'Bad Request: Session ID missing' });
    }

    try {
        const owner = await redisClient.get(`session:${sessionId}:owner`);
        if (!owner) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (owner !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not own this session' });
        }

        next();
    } catch (error) {
        console.error('Redis error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create a session
app.post('/mcp', mcpRateLimiter, async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const sessionId = uuidv4();
    try {
        await redisClient.set(`session:${sessionId}:owner`, userId);
        res.status(201).json({ sessionId });
    } catch (error) {
        console.error('Redis error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Check session ownership
app.get('/mcp/:sessionId/check', mcpRateLimiter, ensureSessionOwner, (req, res) => {
    res.status(200).json({ status: 'ok', message: 'You own this session' });
});

// Only listen if not in test environment
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Cipher-tube server running on port ${PORT}`);
    });
}

export { app, redisClient };
