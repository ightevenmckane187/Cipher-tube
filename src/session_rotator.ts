import crypto from "crypto";
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
 * Hashes a token to a blinded representation for secure lookup and routing.
 *
 * @param token - The raw session token.
 * @returns The SHA-256 hash of the token.
 */
export function blindToken(token: string): string {
  if (!token || typeof token !== "string") {
    return "";
  }
  return fastHash("sha256", token, "hex");
}

/**
 * Creates a new session in Redis.
 *
 * @param userId - The ID of the user owning the session.
 * @param redisClient - The Redis client instance.
 * @param ttl - Session time-to-live in seconds.
 * @returns The raw session token.
 */
export async function createSession(
  userId: string,
  redisClient: any,
  ttl: number
): Promise<string> {
  const sessionToken = crypto.randomUUID();
  const sessionKey = getBlindedRedisKey(sessionToken);

  await redisClient.set(sessionKey, userId, {
    EX: ttl,
  });

  return sessionToken;
}

/**
 * Rotates a session token by revoking the old one and issuing a new one.
 *
 * @param oldToken - The current session token.
 * @param redisClient - The Redis client instance.
 * @param ttl - New session time-to-live in seconds.
 * @returns An object containing the new token.
 */
export async function rotateSession(
  oldToken: string,
  redisClient: any,
  ttl: number
): Promise<{ newToken: string }> {
  const oldKey = getBlindedRedisKey(oldToken);
  const userId = await redisClient.get(oldKey);

  if (!userId) {
    throw new Error("Session expired, revoked, or replayed.");
  }

  // Revoke old token
  await redisClient.del(oldKey);

  // Issue new token
  const newToken = await createSession(userId, redisClient, ttl);

  return { newToken };
}
