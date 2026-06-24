import crypto from 'crypto';

/**
 * Validates incoming structural proofs using zero-knowledge verification principles.
 * Verifies that the state token matches structural parameters without revealing origins.
 *
 * @param rawProof - The base64 or hex encoded proof string from headers
 * @returns Promise<boolean> - True if the proof matches system integrity parameters
 */
export async function verifyCryptographicProof(rawProof: string): Promise<boolean> {
    if (!rawProof || typeof rawProof !== 'string') {
        return false;
    }

    try {
        // Decode the structural payload
        const bufferPayload = Buffer.from(rawProof, 'base64').toString('utf8');
        const parsedPayload = JSON.parse(bufferPayload);

        // Sentinel: Ensure parsed payload is a plain object and not null or array
        if (!parsedPayload || typeof parsedPayload !== 'object' || Array.isArray(parsedPayload)) {
            return false;
        }

        const { salt, structuralHash, challengeProof } = parsedPayload;

        // Sentinel: Explicitly validate field presence and types to prevent crashes/logic bypass
        if (
            typeof salt !== 'number' ||
            Number.isNaN(salt) ||
            typeof structuralHash !== 'string' ||
            typeof challengeProof !== 'string'
        ) {
            return false;
        }

        // Enforce a strict time-window constraint (e.g., 5 minutes) to mitigate replay vectors
        const currentEpoch = Date.now();
        const performanceWindow = 5 * 60 * 1000; // 5 minutes in milliseconds

        if (Math.abs(currentEpoch - salt) > performanceWindow) {
            return false;
        }

        // Reconstruct the validation matrix using our native SHA-256 pipeline
        const verificationMatrix = crypto.createHmac('sha256', String(salt));
        verificationMatrix.update(structuralHash);
        const computedProof = verificationMatrix.digest('hex');

        const challengeBuffer = Buffer.from(challengeProof, 'utf8');
        const computedBuffer = Buffer.from(computedProof, 'utf8');

        // Sentinel: timingSafeEqual requires buffers of identical length.
        // Length check is O(1) and does not leak content timing info.
        if (challengeBuffer.length !== computedBuffer.length) {
            return false;
        }

        // Execute a constant-time string comparison to prevent timing side-channel attacks
        return crypto.timingSafeEqual(challengeBuffer, computedBuffer);

    } catch (error) {
        // Sentinel: Log only unexpected errors to prevent log flooding from malformed client input
        if (!(error instanceof SyntaxError)) {
            console.error("Critical: Security framework evaluation failure inside verifier engine:", error);
        }
        return false;
    }
}
