import request from "supertest";
import { app } from "../src/server";

describe("Sentinel Security Enhancements", () => {
  describe("Security Headers", () => {
    it("should include Permissions-Policy on all responses", async () => {
      const response = await request(app).get("/");
      // Sentinel: Enhanced policy includes more restricted features for defense-in-depth
      expect(response.headers["permissions-policy"]).toContain(
        "geolocation=()",
      );
      expect(response.headers["permissions-policy"]).toContain("camera=()");
      expect(response.headers["permissions-policy"]).toContain("microphone=()");
      expect(response.headers["permissions-policy"]).toContain("payment=()");
      expect(response.headers["permissions-policy"]).toContain("usb=()");
      expect(response.headers["permissions-policy"]).toContain(
        "interest-cohort=()",
      );
    });

    it("should include Cache-Control: no-store on sensitive endpoints", async () => {
      const endpoints = [
        { path: "/mcp", method: "post" },
        { path: `/mcp/check`, method: "get" },
        { path: `/session/extend`, method: "post" },
      ];

      for (const { path, method } of endpoints) {
        const req = (request(app) as any)
          [method](path)
          .set("x-user-id", "test-user");
        const res = await req;
        expect(res.headers["cache-control"]).toContain("no-store");
        expect(res.headers["cache-control"]).toContain("no-cache");
        expect(res.headers["pragma"]).toBe("no-cache");
      }
    });
  });

  describe("404 Handling", () => {
    it("should return JSON 404 for unknown routes", async () => {
      const response = await request(app).get("/undefined-endpoint");

      expect(response.status).toBe(404);
      expect(response.headers["content-type"]).toContain("application/json");
      expect(response.body).toEqual({ error: "Not Found" });
    });
  });
});
