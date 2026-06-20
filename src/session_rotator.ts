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
 * Returns a blinded (hashed) version of the token for use in local caches.
 * Sentinel: Separates the cache key namespace from the Redis key namespace.
 *
 * @param token - The raw session token.
 * @returns SHA-256 hash of the token.
 */
export function blindToken(token: string): string {
    if (!token || typeof token !== 'string') {
        return '';
    }
    return fastHash('sha256', token, 'hex');
}

/**
 * Securely creates a new session in Redis.
 * Uses CSPRNG for token generation and stores the blinded hash.
 *
 * @param userId - The ID of the user owning the session.
 * @param redisClient - The active Redis client.
 * @param ttl - Session time-to-live in seconds.
 * @returns The raw session token (to be sent to the client).
 */
export async function createSession(userId: string, redisClient: any, ttl: number): Promise<string> {
    const sessionToken = crypto.randomUUID();
    const sessionKey = getBlindedRedisKey(sessionToken);

    await redisClient.set(sessionKey, userId, { EX: ttl });

    return sessionToken;
}

/**
 * Rotates a session token to prevent long-term session hijacking.
 * Implements replay protection by deleting the old token.
 *
 * @param oldToken - The current session token.
 * @param redisClient - The active Redis client.
 * @param ttl - New session time-to-live in seconds.
 * @returns The fresh session token.
 */
export async function rotateSession(oldToken: string, redisClient: any, ttl: number): Promise<{ newToken: string }> {
    const oldKey = getBlindedRedisKey(oldToken);
    const userId = await redisClient.get(oldKey);

    if (!userId) {
        // Sentinel: Generic error message to prevent revealing session state
        throw new Error("Session expired, revoked, or replayed.");
    }

    const newToken = crypto.randomUUID();
    const newKey = getBlindedRedisKey(newToken);

    // Sentinel: Atomic rotation (as much as possible without Lua)
    // We set the new one first to ensure continuity, then burn the old one.
    await redisClient.set(newKey, userId, { EX: ttl });
    await redisClient.del(oldKey);

    return { newToken };
}
