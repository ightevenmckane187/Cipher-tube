import request from "supertest";

// Mock Redis client before importing app
jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    del: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue(null),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

import { app, redisClient, sessionCache } from "../src/server";
import { createClient } from 'redis';
import { blindToken } from "../src/session_rotator";

describe("Session Rotation and E2EE Data Plane", () => {
  const userId = "test-user";
  let redisMock: any;

  beforeAll(async () => {
    redisMock = (createClient as jest.Mock)();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sessionCache.clear();
  });

  afterAll(async () => {
    // await redisClient.quit();
  });

  describe("POST /mcp", () => {
    it("should create a session and return a raw token", async () => {
      const res = await request(app)
        .post("/mcp")
        .set("x-user-id", userId);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("sessionToken");
      expect(typeof res.body.sessionToken).toBe("string");
    });
  });

  describe("POST /mcp/rotate", () => {
    it("should rotate the token and burn the old one", async () => {
      // 1. Create session
      redisMock.set.mockResolvedValue('OK');
      const createRes = await request(app)
        .post("/mcp")
        .set("x-user-id", userId);
      const oldToken = createRes.body.sessionToken;

      // 2. Rotate session
      redisMock.get.mockResolvedValue(userId);
      redisMock.del.mockResolvedValue(1);
      redisMock.set.mockResolvedValue('OK');

      const rotateRes = await request(app)
        .post("/mcp/rotate")
        .set("x-user-id", userId)
        .set("x-session-token", oldToken);

      expect(rotateRes.status).toBe(200);
      expect(rotateRes.body).toHaveProperty("newToken");
      const newToken = rotateRes.body.newToken;
      expect(newToken).not.toBe(oldToken);

      // 3. Verify old token is burned (Replay Protection)
      redisMock.get.mockResolvedValue(null); // Simulate burned/missing token

      const replayRes = await request(app)
        .post("/mcp/rotate")
        .set("x-user-id", userId)
        .set("x-session-token", oldToken);

      expect(replayRes.status).toBe(401);
      expect(replayRes.body.error).toBe("Session expired, revoked, or replayed.");

      // 4. Verify new token works
      redisMock.get.mockResolvedValue(userId);

      const checkRes = await request(app)
        .get("/mcp/check")
        .set("x-user-id", userId)
        .set("x-session-token", newToken);

      expect(checkRes.status).toBe(200);
    });
  });

  describe("POST /mcp/packet (E2EE Data Plane)", () => {
    let sessionToken: string;
    let blindedHash: string;

    beforeEach(async () => {
      redisMock.set.mockResolvedValue('OK');
      const res = await request(app)
        .post("/mcp")
        .set("x-user-id", userId);
      sessionToken = res.body.sessionToken;
      blindedHash = blindToken(sessionToken);
      redisMock.get.mockResolvedValue(userId);
    });

    it("should accept a valid zero-knowledge payload envelope", async () => {
      const packet = {
        chunk_index: 0,
        blinded_session_hash: blindedHash,
        crypto_envelope: {
          iv: "iv-data",
          auth_tag: "tag-data",
          ciphertext_blob: "blob-data"
        }
      };

      const res = await request(app)
        .post("/mcp/packet")
        .set("x-user-id", userId)
        .set("x-session-token", sessionToken)
        .send(packet);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        target_stream: blindedHash,
        sequence: 0,
        dispatch_ready: true
      });
    });

    it("should reject packet with mismatched session hash", async () => {
      const packet = {
        chunk_index: 0,
        blinded_session_hash: "wrong-hash",
        crypto_envelope: {
          iv: "iv-data",
          auth_tag: "tag-data",
          ciphertext_blob: "blob-data"
        }
      };

      const res = await request(app)
        .post("/mcp/packet")
        .set("x-user-id", userId)
        .set("x-session-token", sessionToken)
        .send(packet);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Session hash mismatch: Routing integrity failure");
    });

    it("should reject malformed packets", async () => {
      const packet = {
        chunk_index: 0,
        // missing blinded_session_hash
        crypto_envelope: {
          iv: "iv-data",
          auth_tag: "tag-data",
          ciphertext_blob: "blob-data"
        }
      };

      const res = await request(app)
        .post("/mcp/packet")
        .set("x-user-id", userId)
        .set("x-session-token", sessionToken)
        .send(packet);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Missing blinded_session_hash");
    });
  });
});
