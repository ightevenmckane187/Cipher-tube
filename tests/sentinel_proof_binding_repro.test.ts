import request from "supertest";
import { app, sessionCache } from "../src/server";
import { generateCipherProof } from "../src/crypto/proofGenerator";
import { createClient } from "redis";
import { blindToken } from "../src/session_rotator";

// Mock Redis client before importing app
jest.mock("redis", () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    get: jest.fn(),
    del: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue(null),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe("MCP Packet Proof Binding Vulnerability", () => {
  const userId = "test-user";
  let redisMock: any;

  beforeAll(async () => {
    redisMock = (createClient as jest.Mock)();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sessionCache.clear();
  });

  it("VULNERABILITY: should accept a proof for a DIFFERENT hash in /mcp/packet", async () => {
    // 1. Create a session to get a valid blinded token
    redisMock.set.mockResolvedValue("OK");
    const createRes = await request(app).post("/mcp").set("x-user-id", userId);
    const sessionToken = createRes.body.sessionToken;
    const blindedToken = blindToken(sessionToken);

    // 2. Generate a proof for a DIFFERENT structural hash (e.g., "MALICIOUS_CONTEXT")
    const { cipherProof } = generateCipherProof("MALICIOUS_CONTEXT");

    // 3. Send the proof to /mcp/packet along with our valid session token
    redisMock.get.mockResolvedValue(userId);

    const packet = {
      chunk_index: 0,
      blinded_session_hash: blindedToken,
      crypto_envelope: {
        iv: "iv-data",
        auth_tag: "tag-data",
        ciphertext_blob: "blob-data",
      },
    };

    const res = await request(app)
      .post("/mcp/packet")
      .set("x-user-id", userId)
      .set("x-session-token", sessionToken)
      .set("x-cipher-proof", cipherProof) // Proof for "MALICIOUS_CONTEXT"
      .send(packet);

    // SECURE: This should fail (403 Forbidden) because the proof is not bound to our blindedToken
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Invalid cryptographic proof/i);
  });

  it("SECURE: should accept a proof bound to the CORRECT blinded token", async () => {
    // 1. Create a session to get a valid blinded token
    redisMock.set.mockResolvedValue("OK");
    const createRes = await request(app).post("/mcp").set("x-user-id", userId);
    const sessionToken = createRes.body.sessionToken;
    const blindedToken = blindToken(sessionToken);

    // 2. Generate a proof for the CORRECT blindedToken
    const { cipherProof } = generateCipherProof(blindedToken);

    // 3. Send the proof to /mcp/packet
    redisMock.get.mockResolvedValue(userId);

    const packet = {
      chunk_index: 0,
      blinded_session_hash: blindedToken,
      crypto_envelope: {
        iv: "iv-data",
        auth_tag: "tag-data",
        ciphertext_blob: "blob-data",
      },
    };

    const res = await request(app)
      .post("/mcp/packet")
      .set("x-user-id", userId)
      .set("x-session-token", sessionToken)
      .set("x-cipher-proof", cipherProof)
      .send(packet);

    expect(res.status).toBe(200);
  });
});
