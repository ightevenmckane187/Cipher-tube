/* eslint-disable @typescript-eslint/no-explicit-any */
import * as crypto from "crypto";

const HEADER_MAGIC = Buffer.from(".ctube");
const HEADER_LENGTH = 6;
const SIGNATURE_LENGTH = 32;

export class PersistenceLayer {
  /**
   * Bolt Optimization & Security Hardened: Explicitly typed as Buffer.
   * Allocates exact target buffer using Buffer.alloc() to avoid uninitialized memory leak hazards,
   * writes the JSON payload directly with .write() to avoid intermediate payload Buffer allocations,
   * and uses zero-copy subarray views to pass to HMAC update, maximizing performance while maintaining safety.
   */
  save(data: any, key: string): Buffer {
    const payload = JSON.stringify(data);
    const payloadByteLength = Buffer.byteLength(payload, "utf8");

    // Security Hardening: Use Buffer.alloc instead of Buffer.allocUnsafe to avoid uninitialized heap memory leak hazards
    const out = Buffer.alloc(
      HEADER_LENGTH + SIGNATURE_LENGTH + payloadByteLength,
    );

    // Zero-copy set of pre-allocated header
    out.set(HEADER_MAGIC, 0);

    // Direct UTF-8 write of the payload to avoid intermediate Buffer allocation
    out.write(
      payload,
      HEADER_LENGTH + SIGNATURE_LENGTH,
      payloadByteLength,
      "utf8",
    );

    // Zero-copy subarray view of the written payload region to pass to HMAC update
    const payloadSubarray = out.subarray(
      HEADER_LENGTH + SIGNATURE_LENGTH,
      HEADER_LENGTH + SIGNATURE_LENGTH + payloadByteLength,
    );

    const hmac = crypto.createHmac("sha256", key);
    hmac.update(payloadSubarray);
    const signature = hmac.digest();

    // Zero-copy set of hmac signature
    out.set(signature, HEADER_LENGTH);

    return out;
  }

  /**
   * Bolt Optimization: Keeps return type as any for unit test compatibility.
   * Uses zero-copy subarray views and fast binary integer header validation.
   */
  verifyAndLoad(buffer: Buffer, key: string): any {
    if (!Buffer.isBuffer(buffer)) {
      throw new Error("Input must be a Buffer");
    }
    if (buffer.length < 38) {
      throw new Error("Invalid format");
    }

    // Bolt Optimization: High-performance binary integer matching instead of .toString()
    // avoids string allocations and decoding overhead on hot validation paths
    if (
      buffer.readUInt32BE(0) !== 0x2e637475 ||
      buffer.readUInt16BE(4) !== 0x6265
    ) {
      throw new Error("Invalid format");
    }

    // Bolt Optimization: Zero-copy subarray view instead of slice
    const signature = buffer.subarray(6, 38);
    const payloadSubarray = buffer.subarray(38);

    const hmac = crypto.createHmac("sha256", key);
    // Pass Buffer subarray directly to hmac.update() to avoid string conversion overhead
    hmac.update(payloadSubarray);
    const expectedSignature = hmac.digest();

    // Constant-time signature verification
    if (
      signature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(signature, expectedSignature)
    ) {
      throw new Error("Integrity check failed");
    }

    // Decode payload to string only when passing to JSON.parse()
    const payloadStr = payloadSubarray.toString("utf8");
    try {
      return JSON.parse(payloadStr);
    } catch {
      throw new Error("Invalid JSON payload");
    }
  }
}
