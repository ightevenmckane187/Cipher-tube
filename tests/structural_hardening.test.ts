import { verifyCryptographicProof } from "../src/crypto/verifier";

describe("Structural Hardening: Cryptographic Verifier", () => {
  it("should handle null payload without crashing or logging critical errors", async () => {
    // "null" in base64 is "bnVsbA=="
    const nullPayload = Buffer.from("null").toString("base64");

    // We expect this NOT to throw and NOT to trigger console.error
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = await verifyCryptographicProof(nullPayload);

    expect(result).toBe(false);
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should handle malformed JSON without logging critical errors (SyntaxError suppression)", async () => {
    const malformedPayload =
      Buffer.from("{ invalid: json }").toString("base64");
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = await verifyCryptographicProof(malformedPayload);

    expect(result).toBe(false);
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should reject non-string challengeProof without throwing in timingSafeEqual", async () => {
    const payload = JSON.stringify({
      salt: Date.now(),
      structuralHash: "test",
      challengeProof: 123, // Not a string
    });
    const encoded = Buffer.from(payload).toString("base64");

    await expect(verifyCryptographicProof(encoded)).resolves.toBe(false);
  });

  it("should reject wrong-length challengeProof without throwing in timingSafeEqual", async () => {
    const payload = JSON.stringify({
      salt: Date.now(),
      structuralHash: "test",
      challengeProof: "too-short",
    });
    const encoded = Buffer.from(payload).toString("base64");

    // timingSafeEqual would throw if it reached it, but our length check should catch it
    await expect(verifyCryptographicProof(encoded)).resolves.toBe(false);
  });
});
