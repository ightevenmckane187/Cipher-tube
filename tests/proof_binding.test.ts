import request from "supertest";
import { app } from "../src/gatewayServer";
import { generateCipherProof } from "../src/crypto/proofGenerator";
import { cache } from "../src/cache/redisPool";

// Mock Redis to avoid connection issues
jest.mock("../src/cache/redisPool", () => ({
  cache: {
    get: jest.fn(),
    setEx: jest.fn(),
    expire: jest.fn(),
    rawClient: {
      isOpen: true,
      quit: jest.fn(),
    },
  },
}));

describe("Gateway Proof Binding Enforcement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (cache.get as jest.Mock).mockResolvedValue(null);
  });

  it("should reject proof if x-cipher-hash does not match structuralHash in proof payload", async () => {
    const { cipherProof } = generateCipherProof("CHANNEL_A");

    const response = await request(app)
      .post("/v1/channel/verify")
      .set("x-cipher-hash", "CHANNEL_B") // Mismatch!
      .set("x-cipher-proof", cipherProof);

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/structural validation failed/i);
  });

  it("should accept proof if x-cipher-hash strictly matches structuralHash in proof payload", async () => {
    const { cipherHash, cipherProof } = generateCipherProof("CHANNEL_A");

    const response = await request(app)
      .post("/v1/channel/verify")
      .set("x-cipher-hash", cipherHash)
      .set("x-cipher-proof", cipherProof);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("verified");
  });
});
