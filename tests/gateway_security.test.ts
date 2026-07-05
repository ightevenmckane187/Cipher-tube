import request from "supertest";
import { app } from "../src/gatewayServer";

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

describe("Gateway Security Hardening", () => {
  it("should reject excessively large x-cipher-hash header", async () => {
    const largeHash = "a".repeat(129);
    const response = await request(app)
      .post("/v1/channel/verify")
      .set("x-cipher-hash", largeHash)
      .set("x-cipher-proof", "valid-looking-proof");

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/exceeds maximum length/);
  });

  it("should reject excessively large x-cipher-proof header", async () => {
    const largeProof = "a".repeat(4097);
    const response = await request(app)
      .post("/v1/channel/verify")
      .set("x-cipher-hash", "valid-hash")
      .set("x-cipher-proof", largeProof);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/exceeds maximum length/);
  });
});
