import crypto from "crypto";

/**
 * Blinds the raw token using SHA-256.
 * The server only ever stores and looks up this hash.
 */
export function blindToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a raw token for the client and stores the blinded hash in Redis.
 */
export async function createSession(
  userId: string,
  redis: any,
  ttl: number
): Promise<string> {
  // Generate a cryptographically strong raw token (url-safe)
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const blindedKey = blindToken(rawToken);

  // Store the userId under the blinded key with the specified TTL
  await redis.set(`session:${blindedKey}:owner`, userId, { EX: ttl });

  return rawToken;
}

/**
 * Validates the old token, burns it immediately to prevent replay attacks,
 * and issues a fresh raw token with a renewed sliding TTL.
 */
export async function rotateSession(
  oldRawToken: string,
  redis: any,
  ttl: number
): Promise<{ newToken: string; userId: string }> {
  const oldBlindedKey = blindToken(oldRawToken);
  const redisKey = `session:${oldBlindedKey}:owner`;

  // 1. Fetch current session data (userId)
  const userId = await redis.get(redisKey);
  if (!userId) {
    throw new Error("Session expired, revoked, or replayed.");
  }

  // 2. Burn the old session instantly (Single-Use Token enforcement)
  await redis.del(redisKey);

  // 3. Mint a brand-new token for the next request
  const newToken = crypto.randomBytes(32).toString("base64url");
  const newBlindedKey = blindToken(newToken);

  // 4. Save the userId under the new blinded key with a fresh TTL
  await redis.set(`session:${newBlindedKey}:owner`, userId, { EX: ttl });

  return { newToken, userId };
}
