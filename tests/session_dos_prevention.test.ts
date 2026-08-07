/* eslint-disable @typescript-eslint/no-explicit-any */
import request from "supertest";
import { app, sessionCache } from "../src/server";
import { createClient } from "redis";

// Mock Redis client to avoid connection issues
jest.mock("redis", () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    get: jest.fn(),
    expire: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue("OK"),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe("Session DoS Prevention and Normalization", () => {
  let redisMock: any;
  const userId = "sentinel-user";

  beforeEach(() => {
    jest.clearAllMocks();
    sessionCache.clear();
    redisMock = (createClient as jest.Mock)();
  });

  it("should reject x-session-token longer than 128 characters", async () => {
    const hugeToken = "a".repeat(200);

    const res = await request(app)
      .get("/mcp/check")
      .set("x-user-id", userId)
      .set("x-session-token", hugeToken);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      "Invalid x-session-token: exceeds maximum length",
    );
  });

  it("should handle x-session-token array format by taking the first element and validating it", async () => {
    const validToken = "valid-token";
    const tokens = [validToken, "ignored-token"];

    // Mock Redis: validToken belongs to sentinel-user
    redisMock.get.mockResolvedValue(userId);

    const res = await request(app)
      .get("/mcp/check")
      .set("x-user-id", userId)
      .set("x-session-token", tokens as any);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("owned");
  });

  it("should reject x-session-token array format if the first element is too long", async () => {
    const hugeToken = "b".repeat(150);
    const tokens = [hugeToken, "valid-token"];

    const res = await request(app)
      .get("/mcp/check")
      .set("x-user-id", userId)
      .set("x-session-token", tokens as any);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      "Invalid x-session-token: exceeds maximum length",
    );
  });

  it("should reject empty or whitespace-only x-session-token", async () => {
    const res = await request(app)
      .get("/mcp/check")
      .set("x-user-id", userId)
      .set("x-session-token", "    ");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized: Missing session token");
  });
});
