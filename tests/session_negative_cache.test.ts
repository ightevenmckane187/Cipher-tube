import request from "supertest";
import { app, sessionCache } from "../src/server";
import { createClient } from "redis";

// Mock Redis client
jest.mock("redis", () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    get: jest.fn(),
    expire: jest.fn().mockResolvedValue(1),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe("Session Cache Penetration (Negative Caching)", () => {
  let redisMock: any;
  const sessionId = "550e8400-e29b-41d4-a716-446655449999";
  const userId = "test-user";

  beforeEach(() => {
    jest.clearAllMocks();
    redisMock = (createClient as jest.Mock)();
    sessionCache.clear();
  });

  it("should call Redis only once for a non-existent session (Negative Caching)", async () => {
    // Mock Redis to return null for the session
    redisMock.get.mockResolvedValue(null);

    // First request for a missing session
    const res1 = await request(app)
      .get(`/mcp/check`)
      .set("x-user-id", userId)
      .set("x-session-token", sessionId);

    expect(res1.status).toBe(404);
    expect(redisMock.get).toHaveBeenCalledTimes(1);

    // Second request for the same missing session
    const res2 = await request(app)
      .get(`/mcp/check`)
      .set("x-user-id", userId)
      .set("x-session-token", sessionId);

    expect(res2.status).toBe(404);
    // Should NOT call Redis again due to negative caching
    expect(redisMock.get).toHaveBeenCalledTimes(1);
  });
});
