import express, { Request, Response, NextFunction, Application } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { cipherTubeGateway } from './gateway/sessionMiddleware';
import { cache } from './cache/redisPool';

export const app: Application = express();
const PORT = process.env.GATEWAY_PORT || 8080;

app.use(helmet({ frameguard: { action: 'deny' }, hsts: { maxAge: 31536000, preload: true } }));
app.use((req, res, next) => {
    res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=(), interest-cohort=()");
    next();
});
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '10kb' }));

const noCache = (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    next();
};
app.get('/system/analytics', cipherTubeGateway, noCache, async (req: Request, res: Response) => {
    try {
        const isOpen = cache.rawClient.isOpen;
        return res.status(200).json({
            status: isOpen ? "Operational" : "Degraded",
            ts: Date.now(),
            metrics: { uptime: process.uptime(), memory: process.memoryUsage().heapUsed, cache: isOpen }
        });
    } catch (err) { return res.status(500).json({ error: "Telemetry fault." }); }
});
app.post('/v1/channel/verify', cipherTubeGateway, (req: Request, res: Response) => {
    return res.status(200).json({ status: "verified", ts: (req as any).cipherState.originEpoch });
});
app.use((req: Request, res: Response) => res.status(404).json({ error: "Route missing." }));
if (process.env.NODE_ENV !== 'test') {
    const srv = app.listen(PORT, () => console.log(`🚀 Gateway on ${PORT}`));
    process.on('SIGTERM', () => srv.close(async () => {
        if (cache.rawClient.isOpen) await cache.rawClient.quit();
        process.exit(0);
    }));
}
