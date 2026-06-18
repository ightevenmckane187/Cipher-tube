import { Request, Response, NextFunction } from 'express';
import { cache } from '../cache/redisPool';
import { verifyCryptographicProof } from '../crypto/verifier';

/**
 * Core validation gateway layer.
 * Intercepts incoming requests, queries the in-memory cache layer,
 * and executes token processing completely off the primary database hot path.
 */
export async function cipherTubeGateway(req: Request, res: Response, next: NextFunction) {
    const x_cipher_proof = req.headers['x-cipher-proof'];
    const x_cipher_hash = req.headers['x-cipher-hash'];

    if (!x_cipher_proof || !x_cipher_hash || typeof x_cipher_proof !== 'string' || typeof x_cipher_hash !== 'string') {
        return res.status(401).json({
            status: "denied",
            message: "Cipher-tube verification tokens missing from payload header."
        });
    }

    try {
        // Step 1: Query local memory pool for verified state hashes
        const persistentState = await cache.get(`state:${x_cipher_hash}`);
        if (persistentState) {
            // Keep window dynamic via rolling expiry (3600 seconds)
            await cache.expire(`state:${x_cipher_hash}`, 3600);
            (req as any).cipherState = JSON.parse(persistentState);
            return next();
        }

        // Step 2: Fall back to cryptographic proof validation if hash is missing
        const structuralIntegrityVerified = await verifyCryptographicProof(x_cipher_proof);
        if (!structuralIntegrityVerified) {
            return res.status(403).json({
                status: "failed",
                message: "Cryptographic proof structural validation failed."
            });
        }

        // Step 3: Write confirmed token to local memory cache pool
        const safePayload = { identitySecured: true, originEpoch: Date.now() };
        await cache.setEx(`state:${x_cipher_hash}`, 3600, JSON.stringify(safePayload));

        (req as any).cipherState = safePayload;
        next();

    } catch (err) {
        // Enforce fallback state containment
        console.error("Gateway Processing Error:", err);
        return res.status(500).json({
            status: "error",
            message: "Internal cryptographic channel fault."
        });
    }
}
