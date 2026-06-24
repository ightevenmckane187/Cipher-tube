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
        let parsedPayload;
        try {
            parsedPayload = JSON.parse(bufferPayload);
        } catch {
            // Sentinel: Suppress JSON.parse errors to prevent log flooding DoS
            return false;
        }

        if (!parsedPayload || typeof parsedPayload !== 'object' || Array.isArray(parsedPayload)) {
            return false;
        }

        const { salt, structuralHash, challengeProof } = parsedPayload;

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

        // Sentinel: Validate challengeProof format and length before comparison
        // SHA-256 hex digest is exactly 64 characters
        if (!/^[0-9a-f]{64}$/i.test(challengeProof)) {
            return false;
        }

        // Reconstruct the validation matrix using our native SHA-256 pipeline
        const verificationMatrix = crypto.createHmac('sha256', String(salt));
        verificationMatrix.update(structuralHash);

        // Bolt Optimization: Compare raw Buffer digests to avoid redundant hex conversion
        // and reduce comparison size from 64 to 32 bytes.
        const computedProofBuffer = verificationMatrix.digest();
        const challengeProofBuffer = Buffer.from(challengeProof, 'hex');

        // Execute a constant-time comparison to prevent timing side-channel attacks
        // Sentinel: Ensure buffer lengths match to prevent timingSafeEqual crashes
        if (challengeProofBuffer.length !== computedProofBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(challengeProofBuffer, computedProofBuffer);

    } catch (error) {
        // Suppress leakage while ensuring system logs capture failure signatures
        console.error("Critical: Security framework evaluation failure inside verifier engine:", error);
        return false;
    }
}
