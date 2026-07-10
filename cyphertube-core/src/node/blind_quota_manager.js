/**
 * CypherTube Sovereign Blind Storage Accounting Engine
 * Enforces data-blind thresholds and handles silent background cache compactions.
 */
export class BlindQuotaManager {
  constructor(mongoDb, storageController, opts = {}) {
    this.db = mongoDb;
    this.storage = storageController;
    this.MAX_PIPELINE_QUOTA_BYTES =
      opts.maxPipelineQuotaBytes || 5 * 1024 * 1024 * 1024; // 5GB limit
    this.NODE_MAX_CAPACITY_BYTES =
      opts.nodeMaxCapacityBytes || 500 * 1024 * 1024 * 1024; // 500GB limit
  }

  async validateQuotaWindow(canonicalBlindId, incomingChunkSizeBytes) {
    const currentDiskUsage = await this.calculateTotalNodeUsage();
    if (
      currentDiskUsage + incomingChunkSizeBytes >=
      this.NODE_MAX_CAPACITY_BYTES
    ) {
      this.executeEmergencyCompaction().catch((err) =>
        console.error("COMPACTION_FAULT: ", err),
      );
      throw new Error(
        "NODE_STORAGE_CRITICAL: Write denied. Capacity ceiling hit.",
      );
    }

    const usageRecord = await this.db
      .collection("storage_ledger")
      .findOne({ canonical_blind_id: canonicalBlindId });
    const currentAllocation = usageRecord ? usageRecord.allocated_bytes : 0;

    if (
      currentAllocation + incomingChunkSizeBytes >
      this.MAX_PIPELINE_QUOTA_BYTES
    ) {
      throw new Error("QUOTA_EXCEEDED: Pipeline footprint threshold breached.");
    }
    return true;
  }

  async registerStorageIngress(
    canonicalBlindId,
    chunkIndex,
    byteSize,
    peerDid = "LOCAL",
  ) {
    await this.db
      .collection("storage_ledger")
      .updateOne(
        { canonical_blind_id: canonicalBlindId },
        {
          $inc: { allocated_bytes: byteSize, segment_count: 1 },
          $set: { last_updated: new Date() },
        },
        { upsert: true },
      );
    await this.db.collection("blind_block_manifest").insertOne({
      canonical_blind_id: canonicalBlindId,
      segment_index: Number(chunkIndex),
      byte_size: byteSize,
      origin: peerDid,
      ingested_at: new Date(),
    });
  }

  async calculateTotalNodeUsage() {
    const res = await this.db
      .collection("storage_ledger")
      .aggregate([
        { $group: { _id: null, total: { $sum: "$allocated_bytes" } } },
      ])
      .toArray();
    return res.length > 0 ? res[0].total : 0;
  }

  async executeEmergencyCompaction() {
    const candidates = await this.db
      .collection("storage_ledger")
      .find({})
      .sort({ allocated_bytes: -1 })
      .limit(10)
      .toArray();
    for (const target of candidates) {
      const blockToPurge = await this.db
        .collection("blind_block_manifest")
        .findOne(
          {
            canonical_blind_id: target.canonical_blind_id,
            origin: { $ne: "LOCAL" },
          },
          { sort: { ingested_at: 1 } },
        );
      if (blockToPurge) {
        const targetPath = `p2p/${blockToPurge.canonical_blind_id}/${blockToPurge.segment_index}.enc`;
        await this.storage.minio.removeObject(
          this.storage.bucketName,
          targetPath,
        );
        await this.db
          .collection("blind_block_manifest")
          .deleteOne({ _id: blockToPurge._id });
        await this.db
          .collection("storage_ledger")
          .updateOne(
            { canonical_blind_id: blockToPurge.canonical_blind_id },
            {
              $inc: {
                allocated_bytes: -blockToPurge.byte_size,
                segment_count: -1,
              },
            },
          );
        break; // Re-evaluate total node constraints incrementally
      }
    }
  }
}
