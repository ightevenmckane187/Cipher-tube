import express from 'express';
import { createClient } from '@redis/client';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.connect().catch(console.error);

// ⚡ Bolt Optimization:
// Cache the health response to avoid repeated Date object creation and stringification.
// Update it once per second.
let cachedHealthStatus = { status: 'ok', timestamp: new Date().toISOString() };
setInterval(() => {
    cachedHealthStatus = { status: 'ok', timestamp: new Date().toISOString() };
}, 1000);

// ⚡ Bolt Optimization:
// Move /health endpoint above express.json() to skip unnecessary body parsing overhead.
app.get('/health', (req, res) => {
    res.json(cachedHealthStatus);
});

app.use(express.json());

app.listen(PORT, () => {
    console.log(`Cipher-tube server running on port ${PORT}`);
});
