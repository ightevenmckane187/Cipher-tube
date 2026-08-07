import request from "supertest";

// Mock express-rate-limit before importing app
jest.mock("express-rate-limit", () => {
  const actual = jest.requireActual("express-rate-limit");
  return {
    ...actual,
    __esModule: true,
    default: jest.fn((options) => {
      return actual.rateLimit({
        ...options,
        max: 10,
        windowMs: 15 * 60 * 1000,
      });
    }),
    rateLimit: jest.fn((options) => {
      return actual.rateLimit({
        ...options,
        max: 10,
        windowMs: 15 * 60 * 1000,
      });
    }),
  };
});

import { app } from "../src/server";

// Mock Redis client to avoid connection issues
jest.mock("redis", () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    get: jest.fn(),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe("Middleware Order Security", () => {
  it("should include core security headers but NOT CSP in 429 rate-limited responses from global limiter", async () => {
    // Hit root endpoint which only has global middleware
    // Limit is mocked to 10
    for (let i = 0; i < 10; i++) {
      await request(app).get("/");
    }

    const response = await request(app).get("/");

    expect(response.status).toBe(429);

    // Core security headers should be present (applied BEFORE apiLimiter)
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["strict-transport-security"]).toBeDefined();

    // CSP should NOT be present on 429 because it's applied AFTER apiLimiter
    expect(response.headers["content-security-policy"]).toBeUndefined();
  });
});
