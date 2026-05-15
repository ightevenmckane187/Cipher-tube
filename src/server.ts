import express, { Request, Response, NextFunction, Application } from "express";
import { createClient, RedisClientType } from "redis";
import helmet from "helmet";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import rateLimit from "express-rate-limit";
import { LRUCache } from "lru-cache";
import { buildCipherTube, decryptCipherTube } from "./cta";

dotenv.config();

export const app: Application = express();
const PORT = process.env.PORT || 3000;

// In-memory cache for session ownership lookups (Bolt Optimization)
// Sentinel: TTL reduced to 5s to ensure fast propagation of session revocations
export const sessionCache = new LRUCache<string, string>({
    max: 1000,
    ttl: 5 * 1000, // 5 seconds (Fast propagation)
});

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SESSION_TTL = 3600; // 1 hour in seconds

// Rate limiter for general API operations
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Higher limit for general API
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res
      .status(429)
      .json({ error: "Too many requests, please try again later." });
  },
});

const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res
      .status(429)
      .json({ error: "Too many requests, please try again later." });
  },
});

// Security Enhancements: Core Headers (Defense-in-depth for all responses)
app.use(
  helmet({
    contentSecurityPolicy: false, // Applied later after rate limiting
    frameguard: { action: "deny" }, // Ensures X-Frame-Options: DENY
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "same-origin" },
  }),
);
app.disable("x-powered-by"); // Further ensures the header is removed

app.use(apiLimiter); // Sentinel: Apply global rate limiting after core security headers are set

// CSP and Nonce: Applied only to requests that pass the rate limiter
app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.nonce = crypto.randomBytes(16).toString("base64");
  next();
});

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "img.shields.io"],
      "script-src": [
        "'self'",
        (req: any, res: any) => `'nonce-${res.locals.nonce}'`,
      ],
      "style-src": [
        "'self'",
        (req: any, res: any) => `'nonce-${res.locals.nonce}'`,
      ],
      "object-src": ["'none'"],
      "base-uri": ["'none'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
    },
  }),
);

// Serve accessible documentation (WCAG 602.3 compliance)
app.use('/docs', express.static(path.join(__dirname, '../docs')));

app.use(apiLimiter); // Sentinel: Apply global rate limiting before expensive operations

export const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

// Use a mock for testing as per memory instructions
if (process.env.NODE_ENV !== "test") {
  redisClient
    .connect()
    .catch((err: any) => console.error("Redis Connection Error:", err.message));
}

app.get("/", (req: Request, res: Response) => {
  res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
                .header-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .status-text {
                    color: var(--success);
                }
                .input-group {
                    margin-bottom: 1.5rem;
                }
                label {
                    display: block;
                    font-size: 0.875rem;
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                }
                #user-id-input {
                    background: var(--bg-color);
                    border: 1px solid var(--border-color);
                    color: var(--text-color);
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 1rem;
                    width: 100%;
                    max-width: 300px;
                    transition: border-color 0.2s;
                }
                #user-id-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.2);
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
                .kb-shortcut {
                    margin-left: 4px;
                    opacity: 0.8;
                    font-size: 0.7rem;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1px 4px;
                    border-radius: 3px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                }
                .header-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .status-text {
                    color: var(--success);
                }
                @media (max-width: 480px) {
                    .kb-shortcut { display: none; }
                }
                .copy-icon, .check-icon {
                    width: 14px;
                    height: 14px;
                    fill: currentColor;
                }
                .check-icon { display: none; color: #2ecc71; }
                .copy-button.copied .copy-icon { display: none; }
                .copy-button.copied .check-icon { display: block; }
                .header-container { display: flex; justify-content: space-between; align-items: center; }
                .status-text { color: var(--success); font-weight: bold; }
                .kb-hint { margin-left: 4px; font-size: 0.7rem; opacity: 0.8; border: 1px solid rgba(255, 255, 255, 0.3); padding: 1px 4px; border-radius: 3px; font-family: inherit; }
                .input-group { margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
                .input-group label { font-size: 0.875rem; font-weight: 500; }
                .input-group input { background: var(--bg-color); border: 1px solid var(--border-color); color: var(--text-color); padding: 8px 12px; border-radius: 6px; font-size: 0.875rem; width: 100%; max-width: 300px; }
                .input-group input:focus { outline: 2px solid var(--primary); border-color: transparent; }
                .counter-container { display: flex; justify-content: space-between; max-width: 300px; align-items: baseline; }
                #user-id-counter { font-size: 0.75rem; opacity: 0.7; }
                #user-id-counter.near-limit { color: #d63031; opacity: 1; font-weight: bold; }
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
                <div class="header-container">
                    <h1>Cipher Tube Assembly</h1>
                    <button id="theme-toggle" aria-label="Switch Theme" aria-pressed="false" aria-keyshortcuts="t">
                        <span id="theme-icon" aria-hidden="true"></span>
                        <span id="theme-text">Switch to Dark</span>
                        <kbd aria-hidden="true" class="kb-hint">(t)</kbd>
                    </button>
                </div>
                <p>Welcome to the performance-optimized session management service.</p>
                <div role="status" aria-live="polite">
                    <p>
                        <span class="status-dot" aria-hidden="true"></span>
                        <strong>Status:</strong> <span class="status-text">Online</span>
                    </p>
                </div>
                <h2>Quick Start</h2>
                <div class="input-group">
                    <div class="counter-container">
                        <label for="user-id-input">Customize your User ID:</label>
                        <span id="user-id-counter" aria-live="polite">0 / 128</span>
                    </div>
                    <input type="text" id="user-id-input" placeholder="demo-user" maxlength="128" spellcheck="false" aria-describedby="user-id-counter">
                </div>
                <p>To get started, create a session via the API:</p>
                <div class="code-container">
                    <button class="copy-button" id="copy-curl" aria-label="Copy command to clipboard" title="Copy to clipboard" aria-keyshortcuts="c">
                        <svg class="copy-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                        <svg class="check-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                        <span id="copy-text" aria-live="polite">Copy</span>
                        <kbd aria-hidden="true" class="kb-hint">(c)</kbd>
                    </button>
                    <pre tabindex="0" role="region" aria-label="Terminal command example"><code id="curl-command">curl -X POST http://localhost:3000/mcp -H "x-user-id: demo-user"</code></pre>
                </div>
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
                const userIdInput = document.getElementById('user-id-input');
                const userIdCounter = document.getElementById('user-id-counter');

                function updateCurlCommand() {
                    const currentOrigin = window.location.origin;
                    const userId = userIdInput.value.trim() || 'demo-user';
                    curlCommand.textContent = \`curl -X POST \${currentOrigin}/mcp -H "x-user-id: \${userId}"\`;

                    const length = userIdInput.value.length;
                    userIdCounter.textContent = \`\${length} / 128\`;
                    if (length >= 120) {
                        userIdCounter.classList.add('near-limit');
                    } else {
                        userIdCounter.classList.remove('near-limit');
                    }
                }

                userIdInput.addEventListener('input', updateCurlCommand);
                updateCurlCommand();

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
                    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
                    if (e.ctrlKey || e.metaKey || e.altKey) return;
                    if (e.key === 'c') {
                        document.getElementById('copy-curl')?.click();
                    } else if (e.key === 't') {
                        document.getElementById('theme-toggle')?.click();
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

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const jsonParser = express.json({ limit: "10kb" });

const validateUserId = (req: Request, res: Response, next: NextFunction) => {
  let userId = req.headers["x-user-id"];

  if (typeof userId !== "string" || userId.trim() === "") {
    return res
      .status(401)
      .json({ error: "Unauthorized: Missing or invalid x-user-id" });
  }

  // Sentinel: Normalize user ID by trimming whitespace and reassigning to headers
  userId = userId.trim();
  req.headers["x-user-id"] = userId;

  // Custom header 'x-user-id' is validated for presence and length (max 128 chars)
  // Memory instructions require this specific length validation and error message.
  if (userId.length > 128) {
    return res
      .status(400)
      .json({ error: "Invalid x-user-id: exceeds maximum length" });
  }
  next();
};

// Middleware to ensure session ownership
// Sentinel: Relies on validateUserId middleware being called first
const ensureSessionOwner = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let { sessionId } = req.params;
  const userId = req.headers["x-user-id"] as string;

  if (!sessionId) {
    return res.status(400).json({ error: "Bad Request: Missing sessionId" });
  }

  // Handle case where sessionId might be an array (Express 5 type compatibility)
  if (Array.isArray(sessionId)) {
    sessionId = sessionId[0];
  }

  if (!UUID_V4_REGEX.test(sessionId)) {
    return res
      .status(400)
      .json({ error: "Bad Request: Invalid sessionId format" });
  }

  const cachedOwnerId = sessionCache.get(sessionId);
  if (cachedOwnerId) {
    if (cachedOwnerId === userId) return next();
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const ownerId = await redisClient.get(`session:${sessionId}:owner`);
    if (!ownerId) return res.status(404).json({ error: "Session not found" });
    sessionCache.set(sessionId, ownerId);
    if (ownerId !== userId) return res.status(403).json({ error: "Forbidden" });
    next();
  } catch (err: any) {
    console.error(
      "Session ownership check failed:",
      err?.message || "Unknown error",
    );
    res.status(500).json({ error: "Internal server error" });
  }
};

// Session Creation Endpoint
app.post(
  "/mcp",
  sessionLimiter,
  jsonParser,
  validateUserId,
  async (req: Request, res: Response) => {
    const userId = req.headers["x-user-id"] as string;

    const sessionId = crypto.randomUUID();
    const sessionKey = `session:${sessionId}:owner`;
    try {
        // Store session ownership with security-compliant TTL (3600 seconds)
        await redisClient.set(sessionKey, userId, { EX: SESSION_TTL });

      // Optimization: Pre-warm the in-memory cache to skip the first Redis lookup (Bolt Optimization)
      sessionCache.set(sessionId, userId);
      res.status(201).json({ sessionId });
    } catch (err: any) {
      console.error(
        "Session creation failed:",
        err?.message || "Unknown error",
      );
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

app.get(
  "/mcp/:sessionId/check",
  sessionLimiter,
  validateUserId,
  ensureSessionOwner,
  (req: Request, res: Response) => {
    res.json({ message: "Session ownership verified", status: "owned" });
  },
);

/**
 * CTA Encryption Endpoint
 */
app.post(
  "/mcp/:sessionId/encrypt",
  sessionLimiter,
  jsonParser,
  validateUserId,
  ensureSessionOwner,
  (req: Request, res: Response) => {
    const { message, masterSeed } = req.body;

    if (!message || typeof message !== "string") {
      return res
        .status(400)
        .json({ error: "Bad Request: Missing or invalid message" });
    }

    // Validate masterSeed is a 64-char hex string (256-bit)
    if (
      !masterSeed ||
      typeof masterSeed !== "string" ||
      !/^[0-9a-f]{64}$/i.test(masterSeed)
    ) {
      return res.status(400).json({ error: "Bad Request: Invalid masterSeed" });
    }

    try {
      const result = buildCipherTube(
        Buffer.from(message, "utf8"),
        Buffer.from(masterSeed, "hex"),
      );
      res.json(result);
    } catch (err: any) {
      // Sentinel: Log only message to avoid leaking sensitive internal state
      console.error("Encryption failed:", err?.message || "Unknown error");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * CTA Decryption Endpoint
 */
app.post(
  "/mcp/:sessionId/decrypt",
  sessionLimiter,
  jsonParser,
  validateUserId,
  ensureSessionOwner,
  (req: Request, res: Response) => {
    const { ciphertext, masterSeed, tubes } = req.body;

    if (!ciphertext || typeof ciphertext !== "string") {
      return res
        .status(400)
        .json({ error: "Bad Request: Missing or invalid ciphertext" });
    }

    if (
      !masterSeed ||
      typeof masterSeed !== "string" ||
      !/^[0-9a-f]{64}$/i.test(masterSeed)
    ) {
      return res.status(400).json({ error: "Bad Request: Invalid masterSeed" });
    }

    if (!tubes || !Array.isArray(tubes)) {
      return res
        .status(400)
        .json({ error: "Bad Request: Missing or invalid tubes" });
    }

    try {
      const result = decryptCipherTube(
        ciphertext,
        Buffer.from(masterSeed, "hex"),
        tubes,
      );
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
             // Sentinel: Return 400 for all client-side crypto/validation errors.
             // We use the original error message if it's explicitly allowed in the test expectations,
             // otherwise we return a generic message to prevent info leakage.
             const allowedMessages = ['Integrity check failed'];
             const returnedMessage = allowedMessages.some(msg => errorMessage.includes(msg))
                 ? errorMessage
                 : 'Decryption failed';

             return res.status(400).json({ error: returnedMessage });
        }

        res.status(500).json({ error: 'Internal server error: An unexpected error occurred during decryption.' });
    }
  },
);

/**
 * Global error-handling middleware.
 * Sentinel: Catch and sanitize unhandled errors to prevent information leakage and DoS.
 */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (
    err instanceof SyntaxError &&
    "status" in err &&
    err.status === 400 &&
    "body" in err
  ) {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }

  if (err.status === 413) {
    return res
      .status(413)
      .json({ error: "Payload too large: exceeds 10kb limit" });
  }

  // Sentinel: Log only message to avoid leaking sensitive internal state
  console.error("Unhandled Error:", err?.message || "Unknown error");
  res.status(500).json({ error: "Internal server error" });
});

// 404 Handler for unmatched routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

export { app };

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
