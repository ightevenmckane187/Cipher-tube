import crypto from "crypto";

/**
 * CypherTube Client-Side Asymmetric Manifest Verifier
 * Validates short-lived signing keys and intercepts revoked operations.
 */
export class ClientManifestVerifier {
  constructor() {
    this.trustedNodes = new Map(); // nodeDid -> K_node public key
    this.revocationBlacklist = new Set(); // Set of blacklisted K_op keys
  }

  _importPublicKey(pubKey) {
    if (!pubKey) return pubKey;
    if (
      pubKey.type === "public" ||
      typeof pubKey === "string" ||
      pubKey.constructor?.name === "KeyObject"
    ) {
      return pubKey;
    }
    if (Buffer.isBuffer(pubKey)) {
      if (pubKey.toString().includes("PUBLIC KEY")) {
        return pubKey.toString();
      }
      if (pubKey.length === 32) {
        try {
          return crypto.createPublicKey({
            key: pubKey,
            format: "raw",
            type: "public",
          });
        } catch (e) {}
      }
      try {
        return crypto.createPublicKey({
          key: pubKey,
          format: "der",
          type: "spki",
        });
      } catch (e) {}
    }
    return pubKey;
  }

  registerTrustedNode(nodeDid, kNodePublicKeyBuffer) {
    this.trustedNodes.set(nodeDid, kNodePublicKeyBuffer);
  }

  ingestRevocationTicket(ticket) {
    const {
      revocation_target,
      revocation_epoch,
      reason_code,
      issuer_node_did,
      revocation_signature,
    } = ticket;
    const kNodePubKey = this.trustedNodes.get(issuer_node_did);
    if (!kNodePubKey)
      throw new Error("REVOCATION_VERIFY_ERR: Origin node unknown.");

    const serialized = JSON.stringify({
      target: revocation_target,
      epoch: Number(revocation_epoch),
      reason: reason_code,
    });
    const isValid = crypto.verify(
      null,
      Buffer.from(serialized),
      this._importPublicKey(kNodePubKey),
      Buffer.from(revocation_signature, "hex"),
    );

    if (!isValid)
      throw new Error("SECURITY_ALERT: Invalid revocation signature detected.");
    this.revocationBlacklist.add(revocation_target);
  }

  verifyManifest(manifest) {
    const {
      delegation_token,
      manifest_signature,
      canonical_blind_id,
      segment_index,
      crypto_metadata,
    } = manifest;

    if (this.revocationBlacklist.has(delegation_token.op_public_key)) {
      throw new Error(
        "CYPHERTUBE_CRYPTO_ERR: Operation rejected. Key is revoked.",
      );
    }
    if (Math.floor(Date.now() / 1000) > delegation_token.valid_until_epoch) {
      throw new Error(
        "CYPHERTUBE_CRYPTO_ERR: Key authority windows has expired.",
      );
    }

    const kNodePubKey = this.trustedNodes.get(delegation_token.issuer_node_did);
    if (!kNodePubKey)
      throw new Error(
        "CYPHERTUBE_CRYPTO_ERR: Unrecognized manifest authority.",
      );

    const serializedDelegation = JSON.stringify({
      pubKey: delegation_token.op_public_key,
      expiry: Number(delegation_token.valid_until_epoch),
    });
    const isDelegationValid = crypto.verify(
      null,
      Buffer.from(serializedDelegation),
      this._importPublicKey(kNodePubKey),
      Buffer.from(delegation_token.delegation_signature, "hex"),
    );
    if (!isDelegationValid)
      throw new Error("SECURITY_ALERT: Forged delegation token.");

    const serializedManifest = JSON.stringify({
      blindId: canonical_blind_id,
      idx: Number(segment_index),
      meta: crypto_metadata,
    });
    const isManifestValid = crypto.verify(
      null,
      Buffer.from(serializedManifest),
      this._importPublicKey(Buffer.from(delegation_token.op_public_key, "hex")),
      Buffer.from(manifest_signature, "hex"),
    );
    if (!isManifestValid)
      throw new Error(
        "SECURITY_ALERT: Manifest structural signature mismatch.",
      );

    return true;
  }
}
