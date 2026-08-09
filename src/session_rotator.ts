import crypto from "crypto";
import { fastHash } from "./cta";
import { RedisClientType } from "redis";

/**
 * Calculates a blinded hash for a given session ID or token.
 * Bolt Optimization: Use one-shot crypto.hash via fastHash for ~2x faster hashing.
 *
 * @param token - The raw session ID or token to be blinded.
 * @returns The SHA-256 blinded hash as a hex string, or an empty string if invalid.
 */
export function blindToken(token: string): string {
  if (!token || typeof token !== "string") {
    return "";
  }
  return fastHash("sha256", token, "hex");
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
  return hashed ? `session:${hashed}` : "";
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
export async function createSession(
  userId: string,
  redis: RedisClientType,
  ttl: number,
): Promise<string> {
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
export async function rotateSession(
  oldToken: string,
  redis: RedisClientType,
  ttl: number,
): Promise<{ newToken: string }> {
  const oldKey = getBlindedRedisKey(oldToken);
  const userId = await redis.get(oldKey);

  if (!userId) {
    throw new Error("Session expired, revoked, or replayed.");
  }

  // Sentinel: Atomically check and mark the old token as rotated in Redis for the duration of the 5-second grace period.
  // Using { NX: true } ensures only the FIRST concurrent request can rotate the token, preventing any race conditions or double-rotation replay.
  const rotatedKey = `rotated-flag:${oldKey}`;
  const setSuccess = await redis.set(rotatedKey, "true", { EX: 5, NX: true });
  if (!setSuccess) {
    throw new Error("Session expired, revoked, or replayed.");
  }

  // Create new token
  const newToken = await createSession(userId, redis, ttl);

  // Burn old token with a 5-second grace period instead of immediate deletion
  // This allows in-flight requests with the old token to succeed.
  await redis.expire(oldKey, 5);

  return { newToken };
}

/**
 * Bolt Optimization: Consolidates hashing into a single pass for both local and Redis keys.
 *
 * @param token - The raw session token.
 * @returns Object containing the blinded hash and the Redis-prefixed key.
 */
export function getSessionKeys(token: string): {
  blindedKey: string;
  redisKey: string;
} {
  const hashed = blindToken(token);
  return {
    blindedKey: hashed,
    redisKey: hashed ? `session:${hashed}` : "",
  };
}
