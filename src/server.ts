import express, { Request, Response, NextFunction, Application } from 'express';
import { createClient, RedisClientType } from 'redis';
import helmet from 'helmet';
import dotenv from 'dotenv';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { LRUCache } from 'lru-cache';
import path from 'path';
import { buildCipherTube, decryptCipherTube } from './cta';

dotenv.config();

export const app: Application = express();
const PORT = process.env.PORT || 3000;

// In-memory cache for session ownership lookups (Bolt Optimization)
// Using LRU cache to prevent memory leaks with 5s TTL and 1000 items limit
export const sessionCache = new LRUCache<string, string>({
    max: 1000,
    ttl: 5000, // 5 seconds
});

// Session ID Validation (UUID v4)
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SESSION_TTL = 3600; // 1 hour in seconds (Standardized for compliance)

// Rate limiter for general API operations
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Higher limit for general API
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
        res.status(429).json({ error: 'Too many requests, please try again later.' });
    },
});

// Rate limiter for session-related operations
const sessionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
        res.status(429).json({ error: 'Too many requests, please try again later.' });
    },
});

// Security Enhancements: Core Headers (Defense-in-depth for all responses)
app.use(helmet({
    contentSecurityPolicy: false, // Applied later after rate limiting
    frameguard: { action: 'deny' }, // Ensures X-Frame-Options: DENY
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    referrerPolicy: { policy: 'same-origin' },
}));
app.disable('x-powered-by'); // Further ensures the header is removed

app.use(apiLimiter); // Sentinel: Apply global rate limiting after core security headers are set

// CSP and Nonce: Applied only to requests that pass the rate limiter
app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
});

app.use(helmet.contentSecurityPolicy({
    directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "img.shields.io"],
        "script-src": ["'self'", (req: any, res: any) => `'nonce-${res.locals.nonce}'`],
        "style-src": ["'self'", (req: any, res: any) => `'nonce-${res.locals.nonce}'`],
        "object-src": ["'none'"],
        "base-uri": ["'none'"],
        "form-action": ["'self'"],
        "frame-ancestors": ["'none'"],
    },
}));

// Serve accessible documentation (WCAG 602.3 compliance)
app.use('/docs', express.static(path.join(__dirname, '../docs')));

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
            <style nonce="${res.locals.nonce}">
                :root {
                    --primary: #007bff;
                    --success: #1e7e34;
                    --success-glow: rgba(30, 126, 52, 0.4);
                    --bg-color: #ffffff;
                    --text-color: #1d1d1f;
                    --border-color: #ccc;
                    --error: #d93025;
                }
                [data-theme='dark'] {
                    --bg-color: #121212;
                    --text-color: #e0e0e0;
                    --border-color: #333;
                    --success: #2ecc71;
                    --success-glow: rgba(46, 204, 113, 0.4);
                    --error: #f28b82;
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
                h1, h2, h3 { color: var(--primary); }
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
                    box-shadow: 0 0 0 var(--success-glow);
                    animation: pulse 2s infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    .status-dot {
                        animation: none;
                    }
                    * {
                        transition: none !important;
                        animation: none !important;
                    }
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 var(--success-glow); }
                    70% { box-shadow: 0 0 0 10px transparent; }
                    100% { box-shadow: 0 0 0 0 transparent; }
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
                a:focus-visible, #theme-toggle:focus-visible, .copy-button:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
                .code-container {
                    position: relative;
                    margin: 1rem 0;
                    background: #1e1e1e;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 1px solid var(--border-color);
                }
                .code-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 8px 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                pre {
                    margin: 0;
                    padding: 1rem;
                    overflow-x: auto;
                    color: #dcdcdc;
                    font-size: 0.875rem;
                    scroll-behavior: smooth;
                }
                pre:focus-visible {
                    outline: 2px solid var(--primary);
                    outline-offset: -2px;
                }
                .copy-button {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: #fff;
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.75rem;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .copy-button:hover { background: rgba(255, 255, 255, 0.2); }
                .copy-button:focus-visible { outline: 2px solid var(--primary); }
                .copy-icon, .check-icon {
                    width: 14px;
                    height: 14px;
                    fill: currentColor;
                }
                .check-icon { display: none; color: #2ecc71; }
                .copy-button.copied .copy-icon { display: none; }
                .copy-button.copied .check-icon { display: block; }

                /* Session Timeout Banner Styles */
                #timeout-banner {
                    display: none;
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--bg-color);
                    border: 2px solid var(--primary);
                    padding: 1rem 2rem;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 1000;
                    align-items: center;
                    gap: 1rem;
                }
                #extend-session-btn {
                    background: var(--primary);
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                }
                #extend-session-btn:focus-visible {
                    outline: 3px solid var(--primary);
                    outline-offset: 2px;
                }
            </style>
        </head>
        <body>
            <a class="skip-link" href="#main-content">Skip to content</a>
            <header role="banner">
                <nav aria-label="Main Navigation">
                     <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold; color: var(--primary);">Cipher Tube</span>
                        <button id="theme-toggle" aria-label="Switch Theme" aria-pressed="false" aria-keyshortcuts="t">
                            <span id="theme-icon" aria-hidden="true"></span>
                            <span id="theme-text">Switch to Dark</span>
                            <kbd aria-hidden="true" class="kb-shortcut">(t)</kbd>
                        </button>
                    </div>
                </nav>
            </header>

            <main id="main-content">
                <section aria-labelledby="hero-heading">
                    <h1 id="hero-heading">Cipher Tube Assembly</h1>
                    <p>Welcome to the performance-optimized session management service.</p>
                </section>

                <section aria-labelledby="status-heading">
                    <h2 id="status-heading" class="sr-only">System Status</h2>
                    <div role="status" aria-live="polite">
                        <p>
                            <span class="status-dot" aria-hidden="true"></span>
                            <strong>Status:</strong> <span style="color: var(--success);">Online</span>
                        </p>
                    </div>
                </section>

                <section aria-labelledby="quick-start-heading">
                    <h2 id="quick-start-heading">Quick Start</h2>
                    <p>To get started, create a session via the API:</p>
                    <div class="code-container">
                        <div class="code-header">
                            <span>Terminal</span>
                            <button class="copy-button" id="copy-curl" aria-label="Copy command to clipboard" title="Copy to clipboard" aria-keyshortcuts="c">
                                <svg class="copy-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                                <svg class="check-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                <span id="copy-text" aria-live="polite">Copy</span>
                                <kbd aria-hidden="true" style="margin-left: 4px; font-size: 0.7rem; opacity: 0.8; border: 1px solid rgba(255,255,255,0.3); padding: 1px 4px; border-radius: 3px;">(c)</kbd>
                            </button>
                        </div>
                        <pre tabindex="0" role="region" aria-label="Terminal command example"><code id="curl-command">curl -X POST http://localhost:3000/mcp -H "x-user-id: demo-user"</code></pre>
                    </div>
                </section>
            </main>

            <div id="timeout-banner" role="alert" aria-live="assertive">
                <span>Session expires in 1 minute.</span>
                <button id="extend-session-btn">Extend Session</button>
            </div>

            <footer role="contentinfo">
                <nav aria-label="Footer navigation">
                    <a href="/health">Health Check</a> |
                    <a href="/docs/USER_GUIDE.md">User Guide</a> |
                    <a href="/docs/ACCESSIBILITY.md">Accessibility Statement</a>
                </nav>
                <p>&copy; 2026 Cipher Tube Assembly</p>
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
                    themeToggle.setAttribute('aria-label', isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode');
                    document.documentElement.setAttribute('data-theme', theme);
                }

                updateUI(document.documentElement.getAttribute('data-theme'));

                themeToggle.addEventListener('click', () => {
                    const currentTheme = document.documentElement.getAttribute('data-theme');
                    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                    localStorage.setItem('theme', newTheme);
                    updateUI(newTheme);
                });

                const copyButton = document.getElementById('copy-curl');
                const copyText = document.getElementById('copy-text');
                const curlCommand = document.getElementById('curl-command');

                const currentOrigin = window.location.origin;
                // Use string concatenation for the inline script to avoid template literal issues in some environments
                curlCommand.textContent = 'curl -X POST ' + currentOrigin + '/mcp -H "x-user-id: demo-user"';

                copyButton.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(curlCommand.textContent);
                        copyButton.classList.add('copied');
                        copyButton.setAttribute('aria-label', 'Command copied to clipboard');
                        copyText.textContent = 'Copied!';
                        setTimeout(() => {
                            copyButton.classList.remove('copied');
                            copyButton.setAttribute('aria-label', 'Copy command to clipboard');
                            copyText.textContent = 'Copy';
                        }, 2000);
                    } catch (err) {
                        console.error('Failed to copy: ', err);
                    }
                });

                // Global Shortcuts
                window.addEventListener('keydown', (e) => {
                    if (e.ctrlKey || e.metaKey || e.altKey) return;
                    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

                    if (e.key === 'c') {
                        copyButton.click();
                    } else if (e.key === 't') {
                        themeToggle.click();
                    }
                });

                // Session Timeout Simulation
                let timeoutWarning;
                let currentSessionId = null;
                const SESSION_DURATION = 3600 * 1000;
                const WARNING_TIME = 60 * 1000;

                function resetTimer() {
                    if (timeoutWarning) clearTimeout(timeoutWarning);
                    document.getElementById('timeout-banner').style.display = 'none';

                    timeoutWarning = setTimeout(() => {
                        document.getElementById('timeout-banner').style.display = 'flex';
                    }, SESSION_DURATION - WARNING_TIME);
                }

                document.getElementById('extend-session-btn').addEventListener('click', async () => {
                    try {
                        if (currentSessionId) {
                            const response = await fetch('/session/' + currentSessionId + '/extend', {
                                method: 'POST',
                                headers: { 'x-user-id': 'demo-user' }
                            });
                            if (response.ok) {
                                resetTimer();
                                alert('Session successfully extended!');
                            } else {
                                alert('Failed to extend session. Please login again.');
                            }
                        } else {
                            resetTimer();
                            alert('Session timer reset (Demo Mode)');
                        }
                    } catch (err) {
                        console.error('Extension failed:', err);
                        alert('A network error occurred.');
                    }
                });

                // Intercept session creation to track ID for extension
                const originalFetch = window.fetch;
                window.fetch = async (...args) => {
                    const response = await originalFetch(...args);
                    if (typeof args[0] === 'string' && args[0].includes('/mcp') && args[1]?.method === 'POST') {
                        const data = await response.clone().json();
                        if (data.sessionId) currentSessionId = data.sessionId;
                    }
                    return response;
                };

                resetTimer();
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
 */
const validateUserId = (req: Request, res: Response, next: NextFunction) => {
    let userId = req.headers['x-user-id'];

    if (typeof userId !== 'string' || userId.trim() === '') {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid x-user-id. Please provide your user identifier in the x-user-id header.' });
    }

    // Sentinel: Normalize user ID by trimming whitespace and reassigning to headers
    userId = userId.trim();
    req.headers['x-user-id'] = userId;

    if (userId.length > 128) {
        return res.status(400).json({ error: 'Invalid x-user-id: exceeds maximum length of 128 characters.' });
    }

    next();
};

// Middleware to ensure session ownership
// Sentinel: Relies on validateUserId middleware being called first
const ensureSessionOwner = async (req: Request, res: Response, next: NextFunction) => {
    let { sessionId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!sessionId) {
        return res.status(400).json({ error: 'Bad Request: Missing sessionId parameter.' });
    }

    // Handle case where sessionId might be an array (Express 5 type compatibility)
    if (Array.isArray(sessionId)) {
        sessionId = sessionId[0];
    }

    if (!UUID_V4_REGEX.test(sessionId)) {
        return res.status(400).json({ error: 'Bad Request: Invalid sessionId format. Expected a UUID v4.' });
    }

    // Optimization: Check in-memory cache first (Bolt Optimization)
    const cachedOwnerId = sessionCache.get(sessionId);
    if (cachedOwnerId) {
        if (cachedOwnerId === userId) {
            return next();
        } else {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to access this session.' });
        }
    }

    try {
        const sessionKey = `session:${sessionId}:owner`;
        const ownerId = await redisClient.get(sessionKey);

        if (!ownerId) {
            return res.status(404).json({ error: 'Session expired or not found. Your session may have timed out due to inactivity.' });
        }

        // Update cache
        sessionCache.set(sessionId, ownerId);

        if (ownerId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to access this session.' });
        }

        next();
    } catch (err: any) {
        // Sentinel: Log only message to avoid leaking sensitive internal state
        console.error('Session ownership check failed:', err?.message || 'Unknown error');
        res.status(500).json({ error: 'Internal server error: Failed to verify session ownership.' });
    }
};

// Session Creation Endpoint
app.post('/mcp', sessionLimiter, jsonParser, validateUserId, async (req: Request, res: Response) => {
    const userId = req.headers['x-user-id'] as string;

    const sessionId = crypto.randomUUID();
    const sessionKey = `session:${sessionId}:owner`;

    try {
        // Store session ownership with 1-hour TTL
        await redisClient.set(sessionKey, userId, { EX: SESSION_TTL });

        // Optimization: Pre-warm the in-memory cache (Bolt Optimization)
        sessionCache.set(sessionId, userId);

        res.status(201).json({ sessionId });
    } catch (err: any) {
        // Sentinel: Log only message to avoid leaking sensitive internal state
        console.error('Session creation failed:', err?.message || 'Unknown error');
        res.status(500).json({ error: 'Internal server error: Failed to create a new session.' });
    }
});

/**
 * Session Extension Endpoint (WCAG 2.2.1 Compliance)
 */
app.post('/session/:sessionId/extend', sessionLimiter, validateUserId, ensureSessionOwner, async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const sessionKey = `session:${sessionId}:owner`;

    try {
        const userId = req.headers['x-user-id'] as string;
        await redisClient.set(sessionKey, userId, { EX: SESSION_TTL });
        res.json({ message: 'Session successfully extended', newTtl: SESSION_TTL });
    } catch (err: any) {
        console.error('Session extension failed:', err?.message || 'Unknown error');
        res.status(500).json({ error: 'Internal server error: Failed to extend session.' });
    }
});

// Check Session Ownership Endpoint
app.get('/mcp/:sessionId/check', sessionLimiter, validateUserId, ensureSessionOwner, (req: Request, res: Response) => {
    res.json({ message: 'Session ownership verified', status: 'owned' });
});

/**
 * CTA Encryption Endpoint
 */
app.post('/mcp/:sessionId/encrypt', sessionLimiter, jsonParser, validateUserId, ensureSessionOwner, (req: Request, res: Response) => {
    const { message, masterSeed } = req.body;

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Bad Request: Missing or invalid message string.' });
    }

    // Validate masterSeed is a 64-char hex string (256-bit)
    if (!masterSeed || typeof masterSeed !== 'string' || !/^[0-9a-f]{64}$/i.test(masterSeed)) {
        return res.status(400).json({ error: 'Bad Request: Invalid masterSeed. Expected a 64-character hex string.' });
    }

    try {
        const result = buildCipherTube(Buffer.from(message, 'utf8'), Buffer.from(masterSeed, 'hex'));
        res.json(result);
    } catch (err: any) {
        // Sentinel: Log only message to avoid leaking sensitive internal state
        console.error('Encryption failed:', err?.message || 'Unknown error');
        res.status(500).json({ error: 'Internal server error during encryption process.' });
    }
});

/**
 * CTA Decryption Endpoint
 */
app.post('/mcp/:sessionId/decrypt', sessionLimiter, jsonParser, validateUserId, ensureSessionOwner, (req: Request, res: Response) => {
    const { ciphertext, masterSeed, tubes } = req.body;

    if (!ciphertext || typeof ciphertext !== 'string') {
        return res.status(400).json({ error: 'Bad Request: Missing or invalid ciphertext hex string.' });
    }

    if (!masterSeed || typeof masterSeed !== 'string' || !/^[0-9a-f]{64}$/i.test(masterSeed)) {
        return res.status(400).json({ error: 'Bad Request: Invalid masterSeed. Expected a 64-character hex string.' });
    }

    if (!tubes || !Array.isArray(tubes)) {
        return res.status(400).json({ error: 'Bad Request: Missing or invalid tubes metadata array.' });
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
            errorMessage.includes('Missing hash-lock tube') ||
            errorMessage.includes('Integrity check failed') ||
            errorMessage.includes('bad decrypt') ||
            errorMessage.includes('Wrong tag') ||
            errorMessage.includes('Unsupported state') ||
            errorMessage.includes('first argument must be of type string') ||
            errorMessage.includes('Invalid tag length');

        if (isClientError) {
             // Return 400 for cryptographic or validation failures
             const publicMessage = (errorMessage.includes('Invalid ciphertext') || errorMessage.includes('Invalid tube metadata') || errorMessage.includes('Integrity check failed') || errorMessage.includes('Missing encryption tube') || errorMessage.includes('Missing hash-lock tube') || errorMessage.includes('Missing or invalid fields') || errorMessage.includes('Missing or invalid hash'))
                ? errorMessage
                : 'Decryption failed: The provided data could not be verified or decrypted.';
             return res.status(400).json({ error: publicMessage });
        }

        res.status(500).json({ error: 'Internal server error: An unexpected error occurred during decryption.' });
    }
});

// 404 Handler for unmatched routes
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Resource Not Found: The requested endpoint does not exist.' });
});

/**
 * Global error-handling middleware.
 * Sentinel: Catch and sanitize unhandled errors to prevent information leakage and DoS.
 */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON payload. Please check your request formatting.' });
    }

    if (err.status === 413) {
        return res.status(413).json({ error: 'Payload too large: Request body exceeds the 10kb safety limit.' });
    }

    // Sentinel: Log only message to avoid leaking sensitive internal state
    console.error('Unhandled Error:', err?.message || 'Unknown error');
    res.status(500).json({ error: 'Internal server error: A critical failure occurred.' });
});

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Cipher-tube server running on port ${PORT}`);
    });
}
