/**
 * CypherTube Client-Side Zero-Knowledge Load Balancer
 * Optimizes latency using blind network metrics without leaking session identifiers.
 */
export class ZkLoadBalancer {
  constructor(peerRegistry, opts = {}) {
    this.peerRegistry = peerRegistry; // Map: peerDid -> RegistryState
    this.metrics = new Map(); // Map: peerDid -> { srtt, errorRate, activeRequests }
    this.ALPHA = opts.alpha || 0.125;
    this.BETA = opts.beta || 0.25;
    this.PENALTY_SCALE = opts.penaltyScale || 2.0;
  }

  _ensureMetricsRecord(peerDid) {
    if (!this.metrics.has(peerDid)) {
      this.metrics.set(peerDid, {
        srtt: 200,
        errorRate: 0.0,
        activeRequests: 0,
      });
    }
  }

  recordLatency(peerDid, sampleRttMs) {
    this._ensureMetricsRecord(peerDid);
    const m = this.metrics.get(peerDid);
    m.srtt = (1 - this.ALPHA) * m.srtt + this.ALPHA * sampleRttMs;
  }

  recordTransmissionEvent(peerDid, isFailure) {
    this._ensureMetricsRecord(peerDid);
    const m = this.metrics.get(peerDid);
    m.errorRate =
      (1 - this.BETA) * m.errorRate + this.BETA * (isFailure ? 1.0 : 0.0);
  }

  incrementInFlight(peerDid) {
    this._ensureMetricsRecord(peerDid);
    this.metrics.get(peerDid).activeRequests++;
  }
  decrementInFlight(peerDid) {
    this._ensureMetricsRecord(peerDid);
    const m = this.metrics.get(peerDid);
    m.activeRequests = Math.max(0, m.activeRequests - 1);
  }

  selectOptimalPeer(candidatePeerDids) {
    const activeCandidates = [];
    let totalInverseWeight = 0;

    for (const did of candidatePeerDids) {
      const registryState = this.peerRegistry.get(did);
      if (!registryState || registryState.status !== "ACTIVE") continue;

      this._ensureMetricsRecord(did);
      const metric = this.metrics.get(did);
      const performanceScore =
        metric.srtt * (1.0 + this.PENALTY_SCALE * metric.errorRate) +
        metric.activeRequests * 25;
      const weight =
        performanceScore > 0
          ? (100000 / performanceScore) * (registryState.score / 100)
          : 1;

      activeCandidates.push({ did, weight });
      totalInverseWeight += weight;
    }

    if (activeCandidates.length === 0) return null;

    const randomBuffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(randomBuffer);
    const targetThreshold = (randomBuffer[0] / 0xffffffff) * totalInverseWeight;

    let cumulativeWeight = 0;
    for (const candidate of activeCandidates) {
      cumulativeWeight += candidate.weight;
      if (cumulativeWeight >= targetThreshold) return candidate.did;
    }
    return activeCandidates[0].did;
  }
}
