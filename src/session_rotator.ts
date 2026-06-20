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

/**
 * High-performance session token blinding for constant-time lookups and leak protection.
 */
export function blindToken(token: string): string {
    if (!token) return '';
    return fastHash('sha256', token, 'hex');
}

/**
 * Creates a new session in Redis and returns a secure token.
 */
export async function createSession(userId: string, redis: any, ttl: number): Promise<string> {
    const token = crypto.randomUUID();
    const blindedKey = getBlindedRedisKey(token);
    await redis.set(blindedKey, userId, { EX: ttl });
    return token;
}

/**
 * Rotates a session token, burning the old one and creating a new one.
 */
export async function rotateSession(oldToken: string, redis: any, ttl: number): Promise<{ newToken: string }> {
    const oldBlindedKey = getBlindedRedisKey(oldToken);
    const userId = await redis.get(oldBlindedKey);

    if (!userId) {
        throw new Error("Session expired, revoked, or replayed.");
    }

    const newToken = crypto.randomUUID();
    const newBlindedKey = getBlindedRedisKey(newToken);

    // Burn old, set new
    await redis.del(oldBlindedKey);
    await redis.set(newBlindedKey, userId, { EX: ttl });

    return { newToken };
}
