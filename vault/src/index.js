"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const verifier_1 = require("../../src/crypto/verifier");
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json({ limit: "10kb" }));
async function ensureZKP(req, res, next) {
  const proof = req.headers["x-cipher-proof"];
  if (!proof) {
    return res
      .status(401)
      .json({ error: "Missing ZKP authentication header." });
  }
  const isValid = await (0, verifier_1.verifyCryptographicProof)(proof);
  if (!isValid) {
    return res.status(403).json({ error: "Invalid cryptographic proof." });
  }
  next();
}
app.post("/webhook/bitcoin-l2", ensureZKP, (req, res) => {
  const { txid, amount, status } = req.body;
  console.log(
    `[806-Vault] Bitcoin L2 Webhook received: TX ${txid}, Amount ${amount}, Status ${status}`,
  );
  res.status(200).json({
    status: "received",
    ledger: "Bitcoin-L2",
    confirmed: true,
    timestamp: new Date().toISOString(),
  });
});
app.get("/health/financial", ensureZKP, (req, res) => {
  res.json({
    component: "806-Treasury",
    reserves: "1.25B Satoshis",
    liquidity: "High",
    audit_status: "Verified",
    timestamp: new Date().toISOString(),
  });
});
const PORT = 3005;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`🏦 [806-Vault] Treasury API initialized on port ${PORT}`);
  });
}
//# sourceMappingURL=index.js.map
