import crypto from "crypto";

/**
 * CypherTube Zero-Knowledge Multi-Node Signaling Ring
 * Coordinates metadata-blind live transitions through sliding token loop circuits.
 */
export class ZkSignalingRing {
  constructor(privateKeyEd25519, nodeDid, mongoDb) {
    this.privateKey = privateKeyEd25519;
    this.nodeDid = nodeDid;
    this.db = mongoDb ? mongoDb.collection("live_ring_state") : null;
    this.WINDOW_DURATION_SEC = 60;
    this.activeRings = new Map();
  }

  _deriveWindowId(canonicalBlindId, epochTimeSec) {
    const windowEpoch = Math.floor(epochTimeSec / this.WINDOW_DURATION_SEC);
    return crypto
      .createHash("sha256")
      .update(`${canonicalBlindId}:${windowEpoch}`)
      .digest("hex");
  }

  async initializeLiveRing(canonicalBlindId, orderedPeerDids) {
    const currentWindowId = this._deriveWindowId(
      canonicalBlindId,
      Math.floor(Date.now() / 1000),
    );
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const myPos = orderedPeerDids.indexOf(this.nodeDid);
    if (myPos === -1)
      throw new Error("RING_ERR: Local node not present in topology arrays.");

    const nextPeerDid = orderedPeerDids[(myPos + 1) % orderedPeerDids.length];
    this.activeRings.set(currentWindowId, {
      nextPeerDid,
      opPrivateKey: privateKey,
      opPublicKey: publicKey.export({ type: "spki", format: "pem" }),
    });
    return { currentWindowId, nextPeerDid };
  }

  async dispatchTransition(
    canonicalBlindId,
    transitionStateFlag,
    payloadBlock = {},
  ) {
    const currentWindowId = this._deriveWindowId(
      canonicalBlindId,
      Math.floor(Date.now() / 1000),
    );
    const ringContext = this.activeRings.get(currentWindowId);
    if (!ringContext)
      throw new Error(
        "RING_ERR: Active signaling ring loop context unresolved.",
      );

    const framePayload = {
      w: currentWindowId,
      s: transitionStateFlag,
      p: payloadBlock,
      t: Math.floor(Date.now() / 1000),
    };
    const serialized = JSON.stringify(framePayload);
    const signature = crypto.sign(
      null,
      Buffer.from(serialized),
      ringContext.opPrivateKey,
    );

    await this._forwardToNetworkPeer(ringContext.nextPeerDid, {
      senderDid: this.nodeDid,
      windowId: currentWindowId,
      frame: serialized,
      signature: signature.toString("hex"),
    });
  }

  async handleIncomingSignal(packet) {
    const { senderDid, windowId, frame, signature } = packet;
    const ringContext = this.activeRings.get(windowId);
    if (!ringContext) return;

    const isValid = crypto.verify(
      null,
      Buffer.from(frame),
      ringContext.opPublicKey,
      Buffer.from(signature, "hex"),
    );
    if (!isValid) return;

    const decodedFrame = JSON.parse(frame);
    if (
      Math.abs(Math.floor(Date.now() / 1000) - decodedFrame.t) >
      this.WINDOW_DURATION_SEC
    )
      return;

    if (decodedFrame.s === "LIVE_FAILOVER") {
      if (this.db) {
        await this.db.updateOne(
          { stream_window: windowId },
          { $set: { routing_status: "FAILOVER_ACTIVE" } },
          { upsert: true },
        );
      }
    }

    if (senderDid !== this.nodeDid) {
      await this._forwardToNetworkPeer(ringContext.nextPeerDid, packet);
    }
  }

  async _forwardToNetworkPeer(peerDid, packet) {
    console.log(
      `[P2P Signaling] Node ${this.nodeDid} forwarding packet to peer ${peerDid}`,
    );
    if (this.db) {
      await this.db.updateOne(
        { window_id: packet.windowId, peer_did: peerDid },
        { $push: { forwarded_signals: packet } },
        { upsert: true },
      );
    }
  }
}
