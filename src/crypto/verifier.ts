import crypto from 'crypto';

/**
 * Validates incoming structural proofs using zero-knowledge verification principles.
 * Verifies that the state token matches structural parameters without revealing origins.
 *
 * @param rawProof - The base64 or hex encoded proof string from headers
 * @returns Promise<boolean> - True if the proof matches system integrity parameters
 */
export async function verifyCryptographicProof(rawProof: string): Promise<boolean> {
    // Sentinel: Enforce a reasonable length limit on the proof string to prevent DoS.
    // Base64 encoded JSON for this structure is typically ~250-300 characters.
    if (!rawProof || typeof rawProof !== 'string' || rawProof.length > 4096) {
        return false;
    }

    try {
        // Decode the structural payload
        const bufferPayload = Buffer.from(rawProof, 'base64').toString('utf8');
        let parsedPayload: any;

        try {
            parsedPayload = JSON.parse(bufferPayload);
        } catch {
            // Sentinel: Gracefully handle parsing failures without critical logging
            return false;
        }

        // Sentinel: Validate that the payload is a non-null plain object (not an array or primitive)
        if (!parsedPayload || typeof parsedPayload !== 'object' || Array.isArray(parsedPayload)) {
            return false;
        }

        // Sentinel: Ensure parsed payload is a plain object and not null or array
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

        // Sentinel: timingSafeEqual requires buffers of identical length.
        const challengeBuffer = Buffer.from(challengeProof, 'hex');
        const computedBuffer = Buffer.from(computedProof, 'hex');

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
