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
    expire: jest.fn().mockResolvedValue(true),
    quit: jest.fn().mockResolvedValue("OK"),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe("Session Cache Penetration (Negative Caching)", () => {
  let redisMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionCache.clear();
    const { createClient } = require("redis");
    redisMock = createClient();
  });

  it("should call Redis only once for a non-existent session (Negative Caching)", async () => {
    const userId = "test-user";
    const sessionId = "00000000-0000-4000-8000-000000000001";

    // Mock Redis to return null (session not found)
    redisMock.get.mockResolvedValue(null);

    // First request
    const res1 = await request(app)
      .get(`/mcp/${sessionId}/check`)
      .set("x-user-id", userId);

    expect(res1.status).toBe(404);
    expect(redisMock.get).toHaveBeenCalledTimes(1);

    // Second request for the same missing session
    const res2 = await request(app)
      .get(`/mcp/${sessionId}/check`)
      .set("x-user-id", userId);

    expect(res2.status).toBe(404);
    // With negative caching, Redis should NOT be called a second time
    expect(redisMock.get).toHaveBeenCalledTimes(1);
  });
});
