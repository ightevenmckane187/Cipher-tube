/**
 * CypherTube Client-Side Sovereign Playlist & Metadata Store
 * Handles client-side ECIES envelopes and blind CRDT state calculations.
 */
export class PlaylistMetadataStore {
  constructor(clientCryptoCore, clientDid) {
    this.crypto = clientCryptoCore;
    this.myDid = clientDid;
    this.resolvedKeys = new Map();
    this.activePlaylists = new Map();
  }

  async deriveBlindMetaId(playlistId) {
    const encoder = new TextEncoder();
    const hashBuffer = await globalThis.crypto.subtle.digest(
      "SHA-256",
      encoder.encode(playlistId),
    );
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async decryptKeyEnvelope(blindIdMeta, envelopes, myPrivateKeyRaw) {
    const targetEnvelope = envelopes.find(
      (env) => env.recipient_did === this.myDid,
    );
    if (!targetEnvelope)
      throw new Error(
        "METADATA_AUTH_ERR: Local identity lacks decryption access.",
      );

    const kPlistKeyObject = await this.crypto.asymmetricDecrypt(
      targetEnvelope.encrypted_key_blob,
      myPrivateKeyRaw,
      targetEnvelope.iv,
    );
    this.resolvedKeys.set(blindIdMeta, kPlistKeyObject);
    return kPlistKeyObject;
  }

  mergeCrdtStates(localDoc, incomingDoc) {
    const consolidatedState = {
      playlist_id: localDoc.playlist_id || incomingDoc.playlist_id,
      owner_did: localDoc.owner_did || incomingDoc.owner_did,
      members: [...(incomingDoc.members || [])],
      entries: new Map(),
    };

    const allOps = [
      ...(localDoc.ops_log || []),
      ...(incomingDoc.ops_log || []),
    ];
    allOps.sort((a, b) => a.timestamp - b.timestamp);

    for (const op of allOps) {
      if (op.type === "ADD") {
        consolidatedState.entries.set(op.op_id, {
          canonicalBlindId: op.canonical_blind_id,
          timestamp: op.timestamp,
          tombstone: false,
        });
      } else if (op.type === "REMOVE") {
        if (consolidatedState.entries.has(op.target_op_id)) {
          const item = consolidatedState.entries.get(op.target_op_id);
          if (op.timestamp >= item.timestamp) item.tombstone = true;
        }
      }
    }
    consolidatedState.ops_log = allOps.filter(
      (val, idx, self) => self.findIndex((o) => o.op_id === val.op_id) === idx,
    );
    return consolidatedState;
  }

  async sealMetadataDocument(blindIdMeta, localStateDoc) {
    const kPlist = this.resolvedKeys.get(blindIdMeta);
    if (!kPlist)
      throw new Error(
        "CRYPTO_STATE_ERR: Missing resolved symmetric K_plist key.",
      );

    const encoder = new TextEncoder();
    const serializedData = encoder.encode(
      JSON.stringify({
        playlist_id: localStateDoc.playlist_id,
        owner_did: localStateDoc.owner_did,
        members: localStateDoc.members,
        ops_log: localStateDoc.ops_log,
      }),
    );

    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const encryptedPayload = await globalThis.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      kPlist,
      serializedData,
    );

    return {
      canonical_blind_id_meta: blindIdMeta,
      encrypted_payload: Buffer.from(encryptedPayload).toString("hex"),
      crypto_metadata: {
        iv: Buffer.from(iv).toString("hex"),
        auth_tag_length: 128,
      },
    };
  }
}
