import express, { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Enhancements
app.use(helmet()); // Sets various security-related HTTP headers
app.disable('x-powered-by'); // Further ensures the header is removed

// Limit JSON payload size to prevent DoS attacks
app.use(express.json({ limit: '10kb' }));

// UUID v4 validation regex
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_TTL = 86400; // 24 hours

let redisClient: RedisClientType | any;
if (process.env.NODE_ENV === 'test') {
    const mockStore: Record<string, string> = {};
    redisClient = { get: async (k: string) => mockStore[k] || null, set: async (k: string, v: string) => { mockStore[k] = v; } };
} else {
    redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    redisClient.on('error', (err: Error) => console.error('Redis Client Error:', err.message));
    redisClient.connect().catch(console.error);
}

const ensureSessionOwner = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'] as string;
    const { sessionId } = req.params;
    if (!userId) return res.status(401).json({ error: 'Missing x-user-id' });
    if (!sessionId || !UUID_V4_REGEX.test(sessionId)) return res.status(400).json({ error: 'Invalid sessionId' });
    const owner = await redisClient.get(`session:${sessionId}:owner`);
    if (!owner) return res.status(404).json({ error: 'Session not found' });
    if (owner !== userId) return res.status(403).json({ error: 'Unauthorized' });
    next();
};

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.post('/mcp', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Missing x-user-id' });
    const sessionId = uuidv4();
    await redisClient.set(`session:${sessionId}:owner`, userId, { EX: SESSION_TTL });
    res.status(201).json({ sessionId });
});
app.get('/mcp/:sessionId/check', ensureSessionOwner, (req, res) => res.json({ status: 'authorized' }));

export { app };

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Cipher-tube server running on port ${PORT}`);
    });
}
