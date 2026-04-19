import express from 'express';
import { createClient } from '@redis/client';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const app: express.Application = express();
const PORT = process.env.PORT || 3232;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisClient: any;

if (process.env.NODE_ENV === 'test' && process.env.USE_REAL_REDIS !== 'true') {
    // Mock Redis Client for Testing if not using real redis
    const mockStorage: Record<string, string> = {};
    redisClient = {
        connect: async () => {},
        get: async (key: string) => mockStorage[key] || null,
        set: async (key: string, value: string) => {
            mockStorage[key] = value;
            return 'OK';
        },
        on: () => {},
        quit: async () => {},
        flushAll: async () => {
            for (const key in mockStorage) delete mockStorage[key];
        },
        isOpen: true
    };
} else {
    redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    redisClient.connect().catch(console.error);
}

app.use(express.json());

// In-memory cache for session ownership to reduce Redis load
// Using a short TTL for eventual consistency
interface CacheEntry {
    owner: string;
    expires: number;
}
const ownershipCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10000; // 10 seconds

// Bolt: Cleanup interval to prevent memory leak by removing expired cache entries
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, entry] of ownershipCache.entries()) {
        if (entry.expires <= now) {
            ownershipCache.delete(sessionId);
        }
    }
}, 60000); // Clean up every minute

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
        // Bolt: Check in-memory cache first to avoid Redis network round-trip
        const now = Date.now();
        const cached = ownershipCache.get(sessionId);
        if (cached && cached.expires > now) {
            if (cached.owner !== userId) {
                return res.status(403).json({ error: 'Forbidden: You do not own this session' });
            }
            return next();
        }

        const owner = await redisClient.get(`session:${sessionId}:owner`);
        if (!owner) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Bolt: Update local cache with Redis result
        ownershipCache.set(sessionId, { owner, expires: now + CACHE_TTL_MS });

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
app.post('/mcp', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const sessionId = uuidv4();
    try {
        // Bolt: Add TTL (1 hour) to session ownership in Redis for better memory management
        await redisClient.set(`session:${sessionId}:owner`, userId, { EX: 3600 });
        res.status(201).json({ sessionId });
    } catch (error) {
        console.error('Redis error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Check session ownership
app.get('/mcp/:sessionId/check', ensureSessionOwner, (req, res) => {
    res.status(200).json({ status: 'ok', message: 'You own this session' });
});

// Only listen if not in test environment
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Cipher-tube server running on port ${PORT}`);
    });
}

export { app, redisClient };
