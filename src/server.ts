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
// Using LRU cache to prevent memory leaks with 5s TTL and 1000 items limit
export const sessionCache = new LRUCache<string, string>({
    max: 1000,
    ttl: 5000, // 5 seconds
});

// Session ID Validation (UUID v4)
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Rate limiter for general API operations
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Higher limit for general API
    standardHeaders: true,
    legacyHeaders: false,
});

// x-user-id validation (type and length)
const isValidUserId = (userId: any): userId is string => {
    return typeof userId === 'string' && userId.trim().length > 0 && userId.length <= 128;
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
app.use(apiLimiter); // Sentinel: Apply global rate limiting
app.disable('x-powered-by'); // Further ensures the header is removed

export const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

const SESSION_TTL = 86400; // 24 hours

// Use a mock for testing as per memory instructions
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
            <meta name="description" content="Cipher Tube Assembly - Optimized session management service.">
            <title>Cipher Tube Assembly</title>
            <script>
                (function() {
                    const savedTheme = localStorage.getItem('theme');
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
                    if (theme === 'dark') {
                        document.documentElement.setAttribute('data-theme', 'dark');
                    }
                })();
            </script>
            <style>
                :root {
                    color-scheme: light;
                    --primary: #007bff;
                    --success: #4cd137;
                    --bg-color: #ffffff;
                    --text-color: #212529;
                }
                html[data-theme='dark'] {
                    color-scheme: dark;
                    --bg-color: #121212;
                    --text-color: #e0e0e0;
                }
                body {
                    font-family: system-ui, -apple-system, sans-serif;
                    line-height: 1.5;
                    max-width: 800px;
                    margin: 2rem auto;
                    padding: 0 1rem;
                    background-color: var(--bg-color);
                    color: var(--text-color);
                    transition: background-color 0.3s, color 0.3s;
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
                a:focus-visible, #theme-toggle:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
            </style>
        </head>
        <body>
            <a class="skip-link" href="#main-content">Skip to content</a>
            <main id="main-content">
                <button id="theme-toggle" aria-label="Toggle dark mode" style="float: right; padding: 0.5rem; cursor: pointer; border: 1px solid var(--primary); border-radius: 4px; background: transparent; color: var(--primary); font-size: 1.25rem;">
                    🌙
                </button>
                <h1>Cipher Tube Assembly</h1>
                <p>Welcome to the performance-optimized session management service.</p>
                <p>
                    <span class="status-dot" aria-hidden="true"></span>
                    <strong>Status:</strong> <span style="color: var(--success);">Online</span>
                </p>
                <h2>Quick Start</h2>
                <p>To get started, create a session via POST /mcp.</p>
            </main>
            <footer>
                <nav aria-label="Footer navigation">
                    <a href="/health">Health Check</a>
                </nav>
            </footer>
            <script>
                const themeToggle = document.getElementById('theme-toggle');
                const html = document.documentElement;

                const updateButton = (theme) => {
                    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
                    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
                };

                // Initialize button state
                const currentTheme = html.getAttribute('data-theme') || 'light';
                updateButton(currentTheme);

                themeToggle.addEventListener('click', () => {
                    const isDark = html.getAttribute('data-theme') === 'dark';
                    const newTheme = isDark ? 'light' : 'dark';
                    if (newTheme === 'dark') {
                        html.setAttribute('data-theme', 'dark');
                    } else {
                        html.removeAttribute('data-theme');
                    }
                    localStorage.setItem('theme', newTheme);
                    updateButton(newTheme);
                });
            </script>
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

/**
 * Middleware to validate x-user-id header.
 * Checks for existence, type, and length to prevent DoS and cache displacement.
 */
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

// Middleware to ensure session ownership
// Sentinel: Relies on validateUserId middleware being called first
const ensureSessionOwner = async (req: Request, res: Response, next: NextFunction) => {
    const { sessionId } = req.params;
    const userId = req.headers['x-user-id'] as string;

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
app.post('/mcp', sessionLimiter, jsonParser, validateUserId, async (req: Request, res: Response) => {
    const userId = req.headers['x-user-id'] as string;

    const sessionId = crypto.randomUUID();
    const sessionKey = `session:${sessionId}:owner`;

    try {
        // Store session ownership with 24-hour TTL (86400 seconds)
        await redisClient.set(sessionKey, userId, { EX: 86400 });

        // Optimization: Pre-warm the in-memory cache to skip the first Redis lookup (Bolt Optimization)
        sessionCache.set(sessionId, userId);

        res.status(201).json({ sessionId });
    } catch (err: any) {
        // Sentinel: Log only message to avoid leaking sensitive internal state
        console.error('Session creation failed:', err?.message || 'Unknown error');
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Check Session Ownership Endpoint
app.get('/mcp/:sessionId/check', sessionLimiter, validateUserId, ensureSessionOwner, (req: Request, res: Response) => {
    res.json({ message: 'Session ownership verified', status: 'owned' });
});

/**
 * CTA Encryption Endpoint
 * Protects message with 25-layer Cipher Tube Assembly
 */
app.post('/mcp/:sessionId/encrypt', sessionLimiter, jsonParser, validateUserId, ensureSessionOwner, (req: Request, res: Response) => {
    const { message, masterSeed } = req.body;

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Bad Request: Missing or invalid message' });
    }

    // Validate masterSeed is a 64-char hex string (256-bit)
    if (!masterSeed || typeof masterSeed !== 'string' || !/^[0-9a-f]{64}$/i.test(masterSeed)) {
        return res.status(400).json({ error: 'Bad Request: Invalid masterSeed' });
    }

    try {
        const result = buildCipherTube(Buffer.from(message, 'utf8'), Buffer.from(masterSeed, 'hex'));
        res.json(result);
    } catch (err: any) {
        // Sentinel: Log only message to avoid leaking sensitive internal state
        console.error('Encryption failed:', err?.message || 'Unknown error');
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * CTA Decryption Endpoint
 * Reverses the 25-layer assembly and verifies integrity
 */
app.post('/mcp/:sessionId/decrypt', sessionLimiter, jsonParser, validateUserId, ensureSessionOwner, (req: Request, res: Response) => {
    const { ciphertext, masterSeed, tubes } = req.body;

    if (!ciphertext || typeof ciphertext !== 'string') {
        return res.status(400).json({ error: 'Bad Request: Missing or invalid ciphertext' });
    }

    if (!masterSeed || typeof masterSeed !== 'string' || !/^[0-9a-f]{64}$/i.test(masterSeed)) {
        return res.status(400).json({ error: 'Bad Request: Invalid masterSeed' });
    }

    if (!tubes || !Array.isArray(tubes)) {
        return res.status(400).json({ error: 'Bad Request: Missing or invalid tubes' });
    }

    try {
        const result = decryptCipherTube(ciphertext, Buffer.from(masterSeed, 'hex'), tubes);
        res.json(result);
    } catch (err: any) {
        // Sentinel: Log only message to avoid leaking sensitive internal state
        console.error('Decryption failed:', err?.message || 'Unknown error');

        // Check if it's an integrity failure or decryption failure
        if (err.message?.includes('Integrity check failed') || err.message?.includes('bad decrypt') || err.message?.includes('Wrong tag') || err.message?.includes('Unsupported state')) {
             // Return 400 for cryptographic failures, but don't leak details
             return res.status(400).json({ error: err.message?.includes('Integrity check failed') ? err.message : 'Decryption failed' });
        }

        res.status(500).json({ error: 'Internal server error' });
    }
});

export { app };

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Cipher-tube server running on port ${PORT}`);
    });
}
