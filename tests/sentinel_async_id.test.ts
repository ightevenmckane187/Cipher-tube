import { invokeAsync } from "../src/engine/runtime/async";

describe("Sentinel: Async Job ID Hardening", () => {
  it("should generate a cryptographically secure hex string as jobId", async () => {
    const { jobId } = await invokeAsync("test-workflow", { foo: "bar" });

    // crypto.randomBytes(8).toString('hex') produces a 16-character hex string
    expect(jobId).toMatch(/^[0-9a-f]{16}$/);

    // Verify uniqueness over several calls
    const ids = new Set();
    ids.add(jobId);
    for (let i = 0; i < 100; i++) {
      const { jobId: newId } = await invokeAsync("test-workflow", {});
      expect(newId).toMatch(/^[0-9a-f]{16}$/);
      ids.add(newId);
    }
    expect(ids.size).toBe(101);
  });
});
