import crypto from 'crypto';
import { LRUCache } from 'lru-cache';

/**
 * Bolt Optimization: In-memory cache for cryptographic proof verification results.
 * Reduces CPU load by skipping expensive HMAC and JSON parsing for repeated packets.
 */
const proofCache = new LRUCache<string, boolean>({
    max: 5000,
    ttl: 5 * 60 * 1000, // Default 5 minutes
});

/**
 * Validates incoming structural proofs using zero-knowledge verification principles.
 * Verifies that the state token matches structural parameters without revealing origins.
 *
 * @param rawProof - The base64 or hex encoded proof string from headers
 * @returns Promise<boolean> - True if the proof matches system integrity parameters
 */
export async function verifyCryptographicProof(rawProof: string): Promise<boolean> {
    // Sentinel: Enforce a reasonable length limit on the proof string to prevent DoS.
    if (!rawProof || typeof rawProof !== 'string' || rawProof.length > 4096) {
        return false;
    }

    // Bolt Optimization: Quick cache lookup for identical proof tokens
    const cachedResult = proofCache.get(rawProof);
    if (cachedResult !== undefined) {
        return cachedResult;
    }

    try {
        // Decode the structural payload
        const bufferPayload = Buffer.from(rawProof, 'base64').toString('utf8');
        let parsedPayload: any;

        try {
            parsedPayload = JSON.parse(bufferPayload);
        } catch {
            return false;
        }

        // Sentinel: Validate that the payload is a non-null plain object
        if (!parsedPayload || typeof parsedPayload !== 'object' || Array.isArray(parsedPayload)) {
            return false;
        }

        const { salt, structuralHash, challengeProof } = parsedPayload;

        // Sentinel: Explicitly check types of all required fields
        if (typeof salt !== 'number' || typeof structuralHash !== 'string' || typeof challengeProof !== 'string') {
            return false;
        }

        // Sentinel: Ensure salt is a safe integer (representing milliseconds epoch)
        if (!Number.isSafeInteger(salt)) {
            return false;
        }

        // Enforce a strict time-window constraint (e.g., 5 minutes)
        const currentEpoch = Date.now();
        const performanceWindow = 5 * 60 * 1000;
        const drift = Math.abs(currentEpoch - salt);

        if (drift > performanceWindow) {
            return false;
        }

        // Bolt Optimization: Use binary comparison for HMAC results.
        // Comparing 32-byte Buffers is faster than comparing 64-character hex strings
        // and avoids intermediate string allocations.
        const verificationMatrix = crypto.createHmac('sha256', String(salt));
        verificationMatrix.update(structuralHash);
        const computedBuffer = verificationMatrix.digest();

        // Sentinel: timingSafeEqual requires buffers of identical length.
        // challengeProof is expected to be a 64-char hex string (32 bytes)
        if (challengeProof.length !== 64) {
            proofCache.set(rawProof, false, { ttl: 60000 });
            return false;
        }

        const challengeBuffer = Buffer.from(challengeProof, 'hex');

        if (challengeBuffer.length !== computedBuffer.length) {
            proofCache.set(rawProof, false, { ttl: 60000 });
            return false;
        }

        const isValid = crypto.timingSafeEqual(challengeBuffer, computedBuffer);

        // Bolt Optimization: Cache the result with a TTL matching the remaining validity window
        const remainingTTL = Math.max(0, performanceWindow - drift);
        proofCache.set(rawProof, isValid, { ttl: isValid ? remainingTTL : 60000 });

        return isValid;

    } catch (error) {
        if (!(error instanceof SyntaxError)) {
            console.error("Critical: Security framework evaluation failure inside verifier engine:", error);
        }
        return false;
    }
}
