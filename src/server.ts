import express, { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';
import helmet from 'helmet';
import dotenv from 'dotenv';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { LRUCache } from 'lru-cache';
import { buildCipherTube, decryptCipherTube } from './cta';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory cache for session ownership lookups (Bolt Optimization)
export const sessionCache = new LRUCache<string, string>({
    max: 1000,
    ttl: 5000, // 5 seconds
});

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidUserId = (userId: any): userId is string => {
    return typeof userId === 'string' && userId.length > 0 && userId.length <= 128;
};

const sessionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(helmet());
app.disable('x-powered-by');

export const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

if (process.env.NODE_ENV !== 'test') {
    redisClient.connect().catch((err: any) => console.error('Redis Connection Error:', err.message));
}

app.get('/', (req: Request, res: Response) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Cipher Tube Assembly</title>
        </head>
        <body>
            <main>
                <div id="main-content">
                    <h1>Cipher Tube Assembly</h1>
                    <p>Quick Start: Create a session to begin.</p>
                </div>
            </main>
            <footer>
                <nav>
                    <a href="/health">Service Health Status</a>
                    <span>Health Check</span>
                </nav>
            </footer>
        </body>
        </html>
    `);
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const jsonParser = express.json({ limit: '10kb' });

const validateUserId = (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'];
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid x-user-id' });
    }
    if (userId.length > 128) {
        return res.status(400).json({ error: 'Invalid x-user-id: exceeds maximum length' });
    }
    next();
};

const ensureSessionOwner = async (req: Request, res: Response, next: NextFunction) => {
    const { sessionId } = req.params;
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing x-user-id' });
    }

    if (!isValidUserId(userId) || !sessionId || !UUID_V4_REGEX.test(sessionId)) {
        return res.status(400).json({ error: 'Bad Request: Invalid parameters' });
    }

    const cachedOwnerId = sessionCache.get(sessionId);
    if (cachedOwnerId) {
        if (cachedOwnerId === userId) return next();
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const ownerId = await redisClient.get(`session:${sessionId}:owner`);
        if (!ownerId) return res.status(404).json({ error: 'Session not found' });
        sessionCache.set(sessionId, ownerId);
        if (ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });
        next();
    } catch (err: any) {
        console.error('Session ownership check failed:', err?.message || 'Unknown error');
        res.status(500).json({ error: 'Internal server error' });
    }
};

app.post('/mcp', sessionLimiter, jsonParser, async (req: Request, res: Response) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        return res.status(401).json({ error: 'Missing x-user-id header' });
    }
    if (!isValidUserId(userId)) {
        return res.status(400).json({ error: 'Bad Request: Invalid x-user-id format or exceeds maximum length' });
    }
    const sessionId = crypto.randomUUID();
    try {
        await redisClient.set(`session:${sessionId}:owner`, userId, { EX: 86400 });
        sessionCache.set(sessionId, userId);
        res.status(201).json({ sessionId });
    } catch (err: any) {
        console.error('Session creation failed:', err?.message || 'Unknown error');
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/mcp/:sessionId/check', sessionLimiter, validateUserId, ensureSessionOwner, (req: Request, res: Response) => {
    res.json({ message: 'Session ownership verified', status: 'owned' });
});

app.post('/mcp/:sessionId/encrypt', sessionLimiter, jsonParser, ensureSessionOwner, async (req: Request, res: Response) => {
    const { message, masterSeed } = req.body;
    if (!message || typeof message !== 'string' || !masterSeed || masterSeed.length !== 64) {
        return res.status(400).json({ error: 'Bad Request' });
    }
    try {
        const result = buildCipherTube(Buffer.from(message, 'utf8'), Buffer.from(masterSeed, 'hex'));
        res.status(200).json(result);
    } catch (err: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/mcp/:sessionId/decrypt', sessionLimiter, jsonParser, ensureSessionOwner, async (req: Request, res: Response) => {
    const { ciphertext, tubes, masterSeed } = req.body;
    if (!ciphertext || !tubes || !masterSeed || masterSeed.length !== 64) {
        return res.status(400).json({ error: 'Bad Request' });
    }
    try {
        const result = decryptCipherTube(ciphertext, Buffer.from(masterSeed, 'hex'), tubes);
        res.status(200).json(result);
    } catch (err: any) {
        console.error('Decryption failed:', err?.message || 'Unknown error');
        res.status(400).json({ error: `Decryption failed: ${err?.message || 'Unknown error'}` });
    }
});

export { app };

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
