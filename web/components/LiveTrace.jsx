import React from 'react';

const LiveTrace = () => {
  return (
    <div className="p-4 border rounded shadow-sm bg-black text-green-400 font-mono text-xs h-64 overflow-y-auto">
      <div className="mb-1">[10:45:01] System Initialized</div>
      <div className="mb-1">[10:45:02] Kernel.BrainCore: Heatbeat OK</div>
      <div className="mb-1">[10:45:05] Sentinel-1: Scanning incoming packets...</div>
      <div className="mb-1 text-yellow-300">[10:45:10] Bolt-X: Session created [550e84...]</div>
      <div className="mb-1">[10:45:12] Live Trace Active. Watching all OS events.</div>
    </div>
  );
};

export default LiveTrace;
