import express, { Request, Response, Application } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { cipherTubeGateway } from './gateway/sessionMiddleware';
import { cache } from './cache/redisPool';

export const app: Application = express();
const PORT = process.env.GATEWAY_PORT || 8080;

app.use(helmet({
    frameguard: { action: 'deny' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'same-origin' },
}));

const gatewayLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: 'Too many requests, please try again later.' }),
});

app.use(gatewayLimiter);
app.use(express.json({ limit: '10kb' }));

app.get('/system/analytics', async (req: Request, res: Response) => {
    try {
        const cacheOpen = cache.rawClient.isOpen;
        return res.status(200).json({
            component: "Cipher-Tube Cryptographic Gateway",
            status: cacheOpen ? "Fully Operational" : "Degraded (Cache Disconnected)",
            timestamp: Date.now(),
            metrics: { engineUptime: process.uptime(), memoryUsage: process.memoryUsage().heapUsed, cachePoolActive: cacheOpen }
        });
    } catch (err) {
        return res.status(500).json({ error: "Failed to extract active telemetry." });
    }
});

app.post('/v1/channel/verify', cipherTubeGateway, (req: Request, res: Response) => {
    return res.status(200).json({ status: "verified", channelState: "secure", tokenSignature: (req as any).cipherState.originEpoch });
});

app.use((req: Request, res: Response) => {
    res.status(404).json({ status: "rejected", message: "Specified channel route does not exist." });
});

if (process.env.NODE_ENV !== 'test') {
    const server = app.listen(PORT, () => console.log(`🚀 [Cipher-Tube Core] Ephemeral gateway initialized on port ${PORT}`));
    process.on('SIGTERM', async () => {
        server.close(async () => {
            if (cache.rawClient.isOpen) await cache.rawClient.quit();
            process.exit(0);
        });
    });
}
