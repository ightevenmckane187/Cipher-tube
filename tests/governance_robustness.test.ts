import { AuthorityChainValidator } from "../src/governance/m2522/validator";

describe("AuthorityChainValidator Robustness", () => {
  const validManifestBase = {
    version: "1.0.0",
    framework: "M-25-22",
    owner: "test",
    roles: {
      admin: { name: "Admin", permissions: ["all"] },
    },
    lifecycle_gates: {
      gate1: {
        sentinel_bindings: ["b1"],
        required_signatures: ["admin"],
        required_artifacts: ["a1"],
      },
    },
    governance_controls: {
      high_impact_ai: {
        conditions: [],
        mandatory_signatures: ["admin"],
        mandatory_artifacts: [],
      },
      vendor_lockin_prevention: {
        mandatory_artifacts: [],
      },
    },
    escalation_paths: {},
  };

  it("should throw if roles is an array", () => {
    const manifest = { ...validManifestBase, roles: [] };
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow(
      "manifest.roles must be a non-array object",
    );
  });

  it("should throw if a role is an array", () => {
    const manifest = {
      ...validManifestBase,
      roles: {
        admin: [],
      },
    };
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow(
      "Role admin must be an object",
    );
  });

  it("should throw if lifecycle_gates is an array", () => {
    const manifest = { ...validManifestBase, lifecycle_gates: [] };
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow(
      "manifest.lifecycle_gates must be a non-array object",
    );
  });

  it("should throw if a lifecycle gate is an array", () => {
    const manifest = {
      ...validManifestBase,
      lifecycle_gates: {
        gate1: [],
      },
    };
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow(
      "Lifecycle gate gate1 must be an object",
    );
  });

  it("should throw if sentinel_bindings is not an array", () => {
    const manifest: any = JSON.parse(JSON.stringify(validManifestBase));
    manifest.lifecycle_gates.gate1.sentinel_bindings = "not-an-array";
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow(
      "Lifecycle gate gate1 sentinel_bindings must be an array",
    );
  });

  it("should throw if governance_controls is an array", () => {
    const manifest = { ...validManifestBase, governance_controls: [] };
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow(
      "manifest.governance_controls must be a non-array object",
    );
  });

  it("should throw if high_impact_ai is an array", () => {
    const manifest: any = JSON.parse(JSON.stringify(validManifestBase));
    manifest.governance_controls.high_impact_ai = [];
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow(
      "Missing or invalid governance_controls.high_impact_ai",
    );
  });

  it("should throw if mandatory_signatures is not an array", () => {
    const manifest: any = JSON.parse(JSON.stringify(validManifestBase));
    manifest.governance_controls.high_impact_ai.mandatory_signatures =
      "not-an-array";
    expect(() => AuthorityChainValidator.validate(manifest)).toThrow(
      "governance_controls.high_impact_ai.mandatory_signatures must be an array",
    );
  });
});
