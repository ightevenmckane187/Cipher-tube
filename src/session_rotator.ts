import crypto from 'crypto';
import { fastHash } from './cta';
import { RedisClientType } from 'redis';

/**
 * Calculates a blinded hash for a given session ID or token.
 * Bolt Optimization: Use one-shot crypto.hash via fastHash for ~2x faster hashing.
 *
 * @param token - The raw session ID or token to be blinded.
 * @returns The SHA-256 blinded hash as a hex string.
 */
export function blindToken(token: string): string | null {
    if (!token || typeof token !== 'string') {
        return null;
    }
    return fastHash('sha256', token, 'hex');
}

/**
 * Calculates the blinded Redis key for a given session ID or token.
 * This ensures that even if Redis is compromised, raw session IDs are not exposed.
 *
 * @param token - The raw session ID or token to be blinded.
 * @returns The SHA-256 blinded key prefixed with 'session:'.
 */
export function getBlindedRedisKey(token: string): string {
    const hashed = blindToken(token);
    return hashed ? `session:${hashed}` : '';
}

/**
 * Optimized helper to construct Redis key from an already blinded hash.
 * Bolt Optimization: Saves one redundant hashing operation in hot paths.
 */
export function getRedisKeyFromHash(blindedHash: string): string {
    return `session:${blindedHash}`;
}

/**
 * Creates a new session in Redis and returns the raw token.
 */
export async function createSession(userId: string, redis: RedisClientType, ttl: number): Promise<string> {
    const token = crypto.randomUUID();
    const key = getBlindedRedisKey(token);
    await redis.set(key, userId, { EX: ttl });
    return token;
}

/**
 * Rotates an existing session token.
 * Bolt Optimization: Implements a 5-second grace period for the old token to prevent race conditions
 * during rapid concurrent requests.
 */
export async function rotateSession(oldToken: string, redis: RedisClientType, ttl: number): Promise<{ newToken: string }> {
    const oldKey = getBlindedRedisKey(oldToken);
    const userId = await redis.get(oldKey);

    if (!userId) {
        throw new Error("Session expired, revoked, or replayed.");
    }

    // Create new token
    const newToken = await createSession(userId, redis, ttl);

    // Burn old token with a 5-second grace period instead of immediate deletion
    // This allows in-flight requests with the old token to succeed.
    await redis.expire(oldKey, 5);

    return { newToken };
}
