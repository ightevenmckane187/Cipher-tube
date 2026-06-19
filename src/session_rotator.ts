import { fastHash } from './cta';

/**
 * Calculates the blinded Redis key for a given session ID or token.
 * This ensures that even if Redis is compromised, raw session IDs are not exposed.
 *
 * @param token - The raw session ID or token to be blinded.
 * @returns The SHA-256 blinded key prefixed with 'session:'.
 */
export function getBlindedRedisKey(token: string): string {
    if (!token || typeof token !== 'string') {
        return '';
    }
    // Bolt Optimization: Use one-shot crypto.hash via fastHash for ~2x faster hashing.
    const hashed = fastHash('sha256', token, 'hex');

    return `session:${hashed}`;
}
