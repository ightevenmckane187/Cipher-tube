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

// x-user-id validation (type and length)
const isValidUserId = (userId: any): userId is string => {
    return typeof userId === 'string' && userId.length > 0 && userId.length <= 128;
};

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
                :root {
                    color-scheme: light dark;
                    --primary: #007bff;
                    --success: #4cd137;
                }
                body {
                    font-family: system-ui, -apple-system, sans-serif;
                    line-height: 1.5;
                    max-width: 800px;
                    margin: 2rem auto;
                    padding: 0 1rem;
                    background-color: canvas;
                    color: canvastext;
                    transition: background-color 0.3s, color 0.3s;
                }
                @media (prefers-color-scheme: dark) {
                    body { background-color: #121212; color: #e0e0e0; }
                }
                h1 { color: var(--primary); }
                .skip-link {
                    position: absolute;
                    top: -40px;
                    left: 0;
                    background: var(--primary);
                    color: white;
                    padding: 8px;
                    z-index: 100;
                    transition: top 0.3s;
                    text-decoration: none;
                }
                .skip-link:focus { top: 0; }
                .status-dot {
                    display: inline-block;
                    width: 10px;
                    height: 10px;
                    background-color: var(--success);
                    border-radius: 50%;
                    margin-right: 8px;
                    box-shadow: 0 0 0 rgba(76, 209, 55, 0.4);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(76, 209, 55, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(76, 209, 55, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(76, 209, 55, 0); }
                }
                footer { margin-top: 4rem; font-size: 0.875rem; border-top: 1px solid #ccc; padding-top: 1rem; }
                a { color: var(--primary); text-decoration: none; }
                a:hover { text-decoration: underline; }
                a:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
            </style>
        </head>
        <body>
            <a class="skip-link" href="#main-content">Skip to content</a>
            <main id="main-content">
                <h1>Cipher Tube Assembly</h1>
                <p>Welcome to the performance-optimized session management service.</p>
                <p>
                    <span class="status-dot" aria-hidden="true"></span>
                    <strong>Status:</strong> <span style="color: var(--success);">Online</span>
                </p>
            </main>
            <footer>
                <nav aria-label="Footer navigation">
                    <a href="/health">Service Health Status</a>
                </nav>
            </footer>
        </body>
        </html>
    `);
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware for JSON parsing with size limit
const jsonParser = express.json({ limit: '10kb' });

// Middleware to ensure session ownership
const ensureSessionOwner = async (req: Request, res: Response, next: NextFunction) => {
    const { sessionId } = req.params;
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing x-user-id' });
    }

    if (!isValidUserId(userId)) {
        return res.status(400).json({ error: 'Bad Request: Invalid x-user-id format or length' });
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
    } catch (err: any) {
        // Sentinel: Log only message to avoid leaking sensitive internal state
        console.error('Session ownership check failed:', err?.message || 'Unknown error');
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Session Creation Endpoint
app.post('/mcp', sessionLimiter, jsonParser, async (req: Request, res: Response) => {
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'Missing x-user-id header' });
    }

    if (!isValidUserId(userId)) {
        return res.status(400).json({ error: 'Bad Request: Invalid x-user-id format or length' });
    }

    const sessionId = crypto.randomUUID();
    const sessionKey = `session:${sessionId}:owner`;

    try {
        // Store session ownership with 24-hour TTL (86400 seconds)
        await redisClient.set(sessionKey, userId, { EX: 86400 });

        res.status(201).json({ sessionId });
    } catch (err: any) {
        // Sentinel: Log only message to avoid leaking sensitive internal state
        console.error('Session creation failed:', err?.message || 'Unknown error');
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
