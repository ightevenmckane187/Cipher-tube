import express from 'express';
import { createClient } from 'redis';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Enhancements
app.use(helmet()); // Sets various security-related HTTP headers
app.disable('x-powered-by'); // Further ensures the header is removed

// Limit JSON payload size to prevent DoS attacks
app.use(express.json({ limit: '10kb' }));

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

// Accessible Landing Page with Dark Mode Support
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Cipher Tube</title><style>
        body { font-family: system-ui; text-align: center; padding: 2rem; background: #fff; color: #1a1a1a; }
        @media(prefers-color-scheme:dark){ body { background: #121212; color: #e0e0e0; } }
    </style></head><body><h1>🧪 Cipher Tube Assembly</h1><p>Secure session service is active.</p>
    <div role="status" style="background:#e6f4ea;color:#1e7e34;padding:.5rem;border-radius:20px;display:inline-block">Status: Operational</div>
    </body></html>`);
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export app for testing
export { app };

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Cipher-tube server running on port ${PORT}`);
    });
}
