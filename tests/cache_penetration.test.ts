import request from "supertest";
import { app, redisClient } from "../src/server";

// Mock Redis client
jest.mock("redis", () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    get: jest.fn(),
    expire: jest.fn().mockResolvedValue(true),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe("Cache Penetration Fix Verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should only trigger ONE Redis lookup for multiple requests of the same non-existent session (Fixed)", async () => {
    const userId = "demo-user";
    const nonExistentSessionId = "550e8400-e29b-41d4-a716-446655449999";

    // Mock Redis to return null (session not found)
    (redisClient.get as jest.Mock).mockResolvedValue(null);

    // First request
    const res1 = await request(app)
      .get(`/mcp/check`)
      .set("x-user-id", userId)
      .set("x-session-token", nonExistentSessionId);

    expect(res1.status).toBe(404);
    expect(redisClient.get).toHaveBeenCalledTimes(1);

    // Second request for the SAME non-existent session
    const res2 = await request(app)
      .get(`/mcp/check`)
      .set("x-user-id", userId)
      .set("x-session-token", nonExistentSessionId);

    expect(res2.status).toBe(404);

    // FIXED: Negative caching should prevent the second Redis call.
    expect(redisClient.get).toHaveBeenCalledTimes(1);
  });
});
