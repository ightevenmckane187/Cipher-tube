import { ritualEngine, globalLedger } from "../src/myth/ritual-engine";
import { SovereignCanon } from "../src/myth/canon/sovereign-canon";

describe("Entropy Verification", () => {
  test("Signatures should be 16-character hex strings", () => {
    ritualEngine.dispatch("SENTINEL", "TEST_ACTION", {});
    const chronicle = globalLedger.getChronicle();
    const lastEntry = chronicle[chronicle.length - 1];
    const signaturePart = lastEntry.signature.split("-")[1];
    expect(signaturePart).toHaveLength(16);
    expect(signaturePart).toMatch(/^[0-9a-f]{16}$/);
  });

  test("Audit IDs should be 16-character hex strings", () => {
    const audit = SovereignCanon.auditAction(
      "SENTINEL",
      "TEST_ACTION",
      "Pulse",
    );
    const auditIdPart = audit.auditId.split("-")[1];
    expect(auditIdPart).toHaveLength(16);
    expect(auditIdPart).toMatch(/^[0-9a-f]{16}$/);
  });
});
