import express, { Request, Response } from 'express';
import { cipherTubeGateway } from './gateway/sessionMiddleware';
import { cache } from './cache/redisPool';
import { mcpRouter } from './gateway/mcpRouter';
import { logger } from './telemetry/logger';
import { sanitizeCipherPayload } from './middleware/sanitizer';

export const app = express();
const PORT = process.env.GATEWAY_PORT || 8080;

// Standard body parsers restricted to essential sizes to prevent buffer exhaustion attacks
app.use(express.json({ limit: '10kb' }));

/**
 * 📊 Live Gateway Telemetry Endpoint
 * Exposes core state diagnostics and cache performance metrics safely.
 */
app.get('/system/analytics', async (req: Request, res: Response) => {
    try {
        const cacheOpen = cache.rawClient.isOpen;
        // In a live environment, these are aggregated from internal memory markers
        const diagnosticSnapshot = {
            component: "Cipher-Tube Cryptographic Gateway",
            status: cacheOpen ? "Fully Operational" : "Degraded (Cache Disconnected)",
            timestamp: Date.now(),
            metrics: {
                engineUptime: process.uptime(),
                memoryUsage: process.memoryUsage().heapUsed,
                cachePoolActive: cacheOpen
            }
        };
        return res.status(200).json(diagnosticSnapshot);
    } catch (err) {
        return res.status(500).json({ error: "Failed to extract active telemetry." });
    }
});

/**
 * 🔒 Model Context Protocol (MCP) Router
 * Exposes standardized tools and methods for Agentic AI ecosystems.
 */
app.use('/v1/mcp', mcpRouter);

/**
 * 🔒 Cryptographically Guarded Communication Pipeline
 * Mounts our zero-knowledge structural evaluation layer before granting downstream access.
 */
app.post('/v1/channel/verify', sanitizeCipherPayload, cipherTubeGateway, (req: Request, res: Response) => {
    // If the request makes it here, it has passed all ZK validation boundaries
    return res.status(200).json({
        status: "verified",
        channelState: "secure",
        tokenSignature: (req as any).cipherState.originEpoch
    });
});

// Deep fallback handler for unmapped entry attempts
app.use((req: Request, res: Response) => {
    res.status(404).json({ status: "rejected", message: "Specified channel route does not exist." });
});

// Bootstrapping execution layer
if (process.env.NODE_ENV !== 'test') {
    const server = app.listen(PORT, () => {
        console.log(`🚀 [Cipher-Tube Core] Ephemeral gateway initialized on port ${PORT}`);
    });

    // Graceful breakdown procedures to maintain state cleanliness during cluster recycling
    process.on('SIGTERM', async () => {
        console.log('⚠️ [Cipher-Tube Core] SIGTERM detected. Closing connections gracefully...');
        server.close(async () => {
            if (cache.rawClient.isOpen) {
                await cache.rawClient.quit();
                console.log('📊 [Cache Telemetry] Redis pool connections terminated.');
            }
            process.exit(0);
        });
    });
}
