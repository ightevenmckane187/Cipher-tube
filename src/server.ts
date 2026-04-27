import express, { Request, Response, NextFunction, Application } from 'express';
import { createClient, RedisClientType } from 'redis';
import helmet from 'helmet';
import dotenv from 'dotenv';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { LRUCache } from 'lru-cache';
import { buildCipherTube, decryptCipherTube } from './cta';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// In-memory cache for session ownership lookups (Bolt Optimization)
// Using LRU cache to prevent memory leaks with 5s TTL and 1000 items limit
export const sessionCache = new LRUCache<string, string>({
    max: 1000,
    ttl: 5000, // 5 seconds
});

// Session ID Validation (UUID v4)
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SESSION_TTL = 86400; // 24 hours in seconds

// Rate limiter for general API operations
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Higher limit for general API
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for session-related operations
const sessionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
});

// Security Enhancements
app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "img.shields.io"],
            "script-src": ["'self'", (req: any, res: any) => `'nonce-${res.locals.nonce}'`],
        },
    },
    referrerPolicy: { policy: 'same-origin' },
})); // Sets various security-related HTTP headers
app.use(apiLimiter); // Sentinel: Apply global rate limiting
app.disable('x-powered-by'); // Further ensures the header is removed

export const redisClient: RedisClientType = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

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
            <script nonce="${res.locals.nonce}">
                (function() {
                    const theme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                    document.documentElement.setAttribute('data-theme', theme);
                })();
            </script>
            <style>
                :root {
                    --primary: #007bff;
                    --success: #1e7e34;
                    --bg-color: #ffffff;
                    --text-color: #1d1d1f;
                    --border-color: #ccc;
                }
                [data-theme='dark'] {
                    --bg-color: #121212;
                    --text-color: #e0e0e0;
                    --border-color: #333;
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
                    box-shadow: 0 0 0 rgba(30, 126, 52, 0.4);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(30, 126, 52, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(30, 126, 52, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(30, 126, 52, 0); }
                }
                #theme-toggle {
                    background: none;
                    border: 1px solid var(--border-color);
                    color: var(--text-color);
                    padding: 8px 16px;
                    border-radius: 20px;
                    cursor: pointer;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    float: right;
                }
                #theme-toggle:hover {
                    background-color: var(--border-color);
                }
                #theme-toggle:focus-visible {
                    outline: 2px solid var(--primary);
                    outline-offset: 2px;
                }
                #theme-icon {
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: inline-block;
                }
                #theme-toggle:active #theme-icon {
                    transform: scale(0.8);
                }
                footer { margin-top: 4rem; font-size: 0.875rem; border-top: 1px solid var(--border-color); padding-top: 1rem; }
                a { color: var(--primary); text-decoration: none; }
                a:hover { text-decoration: underline; }
                a:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
            </style>
        </head>
        <body>
            <a class="skip-link" href="#main-content">Skip to content</a>
            <button id="theme-toggle" aria-label="Toggle dark mode" aria-pressed="false">
                <span id="theme-icon">🌓</span>
                <span id="theme-text">Toggle Theme</span>
            </button>
            <main id="main-content">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h1>Cipher Tube Assembly</h1>
                    <button id="theme-toggle" aria-label="Toggle dark mode" style="background: none; border: 1px solid var(--primary); color: var(--primary); padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 1rem;">
                        🌓 Theme
                    </button>
                </div>
                <p>Welcome to the performance-optimized session management service.</p>
                <div role="status">
                    <p>
                        <span class="status-dot" aria-hidden="true"></span>
                        <strong>Status:</strong> <span style="color: var(--success);">Online</span>
                    </p>
                </div>
                <h2>Quick Start</h2>
                <p>To get started, create a session via POST /mcp.</p>
            </main>
            <footer>
                <nav aria-label="Footer navigation">
                    <a href="/health">Health Check</a>
                </nav>
            </footer>
            <script nonce="${res.locals.nonce}">
                const themeToggle = document.getElementById('theme-toggle');
                const themeText = document.getElementById('theme-text');
                const themeIcon = document.getElementById('theme-icon');

                function updateUI(theme) {
                    const isDark = theme === 'dark';
                    themeText.textContent = isDark ? 'Switch to Light' : 'Switch to Dark';
                    themeIcon.textContent = isDark ? '☀️' : '🌙';
                    themeToggle.setAttribute('aria-pressed', isDark);
                }

                updateUI(document.documentElement.getAttribute('data-theme'));

                themeToggle.addEventListener('click', () => {
                    const currentTheme = document.documentElement.getAttribute('data-theme');
                    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

                    document.documentElement.setAttribute('data-theme', newTheme);
                    localStorage.setItem('theme', newTheme);
                    updateUI(newTheme);
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

    if (typeof userId !== 'string' || userId.trim() === '') {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid x-user-id' });
    }

    // Custom header 'x-user-id' is validated for presence and length (max 128 chars)
    // Memory instructions require this specific length validation and error message.
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
        await redisClient.set(sessionKey, userId, { EX: SESSION_TTL });

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

        // Sentinel: Map cryptographic and validation errors to 400 Bad Request
        const errorMessage = err.message || '';
        const isClientError =
            errorMessage.includes('Invalid ciphertext') ||
            errorMessage.includes('Invalid tube metadata') ||
            errorMessage.includes('Missing encryption tube') ||
            errorMessage.includes('Integrity check failed') ||
            errorMessage.includes('bad decrypt') ||
            errorMessage.includes('Wrong tag') ||
            errorMessage.includes('Unsupported state') ||
            errorMessage.includes('first argument must be of type string') ||
            errorMessage.includes('Invalid tag length');

        if (isClientError) {
             // Return 400 for cryptographic or validation failures, but don't leak details unless it's a specific validation error
             const publicMessage = (errorMessage.includes('Invalid ciphertext') || errorMessage.includes('Invalid tube metadata') || errorMessage.includes('Integrity check failed') || errorMessage.includes('Missing encryption tube') || errorMessage.includes('Missing hash-lock tube') || errorMessage.includes('Missing or invalid fields') || errorMessage.includes('Missing or invalid hash'))
                ? errorMessage
                : 'Decryption failed';
             return res.status(400).json({ error: publicMessage });
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
