import crypto from 'crypto';
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
 * Blinds a token using SHA-256 for use in local caches or routing.
 *
 * @param token - The raw session token.
 * @returns The SHA-256 hash of the token.
 */
export function blindToken(token: string): string {
    if (!token || typeof token !== 'string') {
        return '';
    }
    return fastHash('sha256', token, 'hex');
}

/**
 * Creates a new session in Redis.
 *
 * @param userId - The ID of the user owning the session.
 * @param redis - The Redis client.
 * @param ttl - Session time-to-live in seconds.
 * @returns The raw session token.
 */
export async function createSession(userId: string, redis: any, ttl: number): Promise<string> {
    const token = crypto.randomUUID();
    const blindedKey = getBlindedRedisKey(token);
    await redis.set(blindedKey, userId, { EX: ttl });
    return token;
}

/**
 * Rotates an existing session token.
 *
 * @param oldToken - The current session token.
 * @param redis - The Redis client.
 * @param ttl - New session time-to-live.
 * @returns The new session token.
 */
export async function rotateSession(oldToken: string, redis: any, ttl: number): Promise<{ newToken: string }> {
    const oldKey = getBlindedRedisKey(oldToken);
    const userId = await redis.get(oldKey);
    if (!userId) {
        throw new Error("Session expired, revoked, or replayed.");
    }
    const newToken = await createSession(userId, redis, ttl);
    await redis.del(oldKey);
    return { newToken };
}
