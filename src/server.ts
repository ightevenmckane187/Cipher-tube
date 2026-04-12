import express, { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

let redisClient: RedisClientType | any;

if (process.env.NODE_ENV === 'test') {
    // Mock Redis Client for Testing
    const mockStorage: Record<string, string> = {};
    redisClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        get: jest.fn().mockImplementation(async (key: string) => mockStorage[key] || null),
        set: jest.fn().mockImplementation(async (key: string, value: string) => {
            mockStorage[key] = value;
            return 'OK';
        }),
        quit: jest.fn().mockResolvedValue(undefined),
    };
} else {
    redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    redisClient.on('error', (err: any) => console.error('Redis Client Error', err));
    redisClient.connect().catch(console.error);
}

app.use(express.json());

// Ownership Enforcement Middleware
export const ensureSessionOwner = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'] as string;
    const sessionId = req.params.sessionId || req.body.sessionId;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing x-user-id header' });
    }

    if (!sessionId) {
        return res.status(400).json({ error: 'Bad Request: Missing sessionId' });
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
        console.error('Session ownership check error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Create a Session
 * POST /mcp
 * Auth: user id taken from header x-user-id
 */
app.post('/mcp', async (req: Request, res: Response) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing x-user-id header' });
    }

    const sessionId = uuidv4();
    try {
        await redisClient.set(`session:${sessionId}:owner`, userId);
        res.status(201).json({ sessionId });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * Check Session Ownership
 * GET /mcp/:sessionId/check
 */
app.get('/mcp/:sessionId/check', ensureSessionOwner, (req: Request, res: Response) => {
    res.status(200).json({ status: 'owned' });
});

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Cipher-tube server running on port ${PORT}`);
    });
}

export { app, redisClient };
