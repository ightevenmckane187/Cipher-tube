import express, { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';
import helmet from 'helmet';
import dotenv from 'dotenv';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { LRUCache } from 'lru-cache';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory cache for session ownership lookups (Bolt Optimization)
// Using LRU cache to prevent memory leaks with 5s TTL and 1000 items limit
const sessionCache = new LRUCache<string, string>({
    max: 1000,
    ttl: 5000, // 5 seconds
});

// Session ID Validation (UUID v4)
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Rate limiter for session-related operations
const sessionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
});

// Security Enhancements
app.use(helmet()); // Sets various security-related HTTP headers
app.disable('x-powered-by'); // Further ensures the header is removed

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Basic error handling for Redis connection
redisClient.on('error', (err) => {
    // Only log essential info to avoid leaking credentials in the URL
    console.error('Redis Client Error:', err.message);
});

// Use a mock for testing as per memory instructions
if (process.env.NODE_ENV !== 'test') {
    redisClient.connect().catch(console.error);
}

app.get('/', (req: Request, res: Response) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Cipher Tube Assembly</title>
            <style>
                :root { color-scheme: light dark; }
                body {
                    font-family: system-ui, -apple-system, sans-serif;
                    line-height: 1.5;
                    max-width: 800px;
                    margin: 2rem auto;
                    padding: 0 1rem;
                    background-color: canvas;
                    color: canvastext;
                }
                @media (prefers-color-scheme: dark) {
                    body { background-color: #121212; color: #e0e0e0; }
                }
                h1 { color: #007bff; }
            </style>
        </head>
        <body>
            <h1>Cipher Tube Assembly</h1>
            <p>Welcome to the performance-optimized session management service.</p>
            <p>Status: <span style="color: green;">Online</span></p>
        </body>
        </html>
    `);
});

// Optimization: Cache health check response for 1s to reduce CPU overhead (Bolt Optimization)
let cachedHealthResponse: string | null = null;
let lastHealthCheckTime = 0;

app.get('/health', (req: Request, res: Response) => {
    const now = Date.now();
    if (!cachedHealthResponse || now - lastHealthCheckTime > 1000) {
        cachedHealthResponse = JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() });
        lastHealthCheckTime = now;
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(cachedHealthResponse);
});

// Middleware for JSON parsing with size limit
const jsonParser = express.json({ limit: '10kb' });

// Middleware to ensure session ownership
const ensureSessionOwner = async (req: Request, res: Response, next: NextFunction) => {
    const { sessionId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing x-user-id' });
    }

    if (!sessionId) {
        return res.status(400).json({ error: 'Bad Request: Missing sessionId' });
    }

    if (!UUID_V4_REGEX.test(sessionId)) {
        return res.status(400).json({ error: 'Bad Request: Invalid sessionId format' });
    }

    // Optimization: Check in-memory cache first
    const cachedOwnerId = sessionCache.get(sessionId);
    if (cachedOwnerId) {
        if (cachedOwnerId === userId) {
            return next();
        } else {
            return res.status(403).json({ error: 'Forbidden: You do not own this session' });
        }
    }

    try {
        const sessionKey = `session:${sessionId}:owner`;
        const ownerId = await redisClient.get(sessionKey);

        if (!ownerId) {
            return res.status(404).json({ error: 'Session not found or expired' });
        }

        // Update cache
        sessionCache.set(sessionId, ownerId);

        if (ownerId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not own this session' });
        }

        next();
    } catch (err) {
        console.error('Session ownership check failed:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Session Creation Endpoint
app.post('/mcp', sessionLimiter, jsonParser, async (req: Request, res: Response) => {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
        return res.status(401).json({ error: 'Missing x-user-id header' });
    }

    const sessionId = crypto.randomUUID();
    const sessionKey = `session:${sessionId}:owner`;

    try {
        // Store session ownership with 24-hour TTL (86400 seconds)
        await redisClient.set(sessionKey, userId, { EX: 86400 });

        // Optimization: Pre-warm the in-memory cache to skip the first Redis lookup (Bolt Optimization)
        sessionCache.set(sessionId, userId);

        res.status(201).json({ sessionId });
    } catch (err) {
        console.error('Session creation failed:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Check Session Ownership Endpoint
app.get('/mcp/:sessionId/check', sessionLimiter, ensureSessionOwner, (req: Request, res: Response) => {
    res.json({ message: 'Session ownership verified' });
});

// Export app for testing
export { app };

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Cipher-tube server running on port ${PORT}`);
    });
}
