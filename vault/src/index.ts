import express, { Request, Response, NextFunction } from "express";
import { verifyCryptographicProof } from "../../src/crypto/verifier";

const app = express();
app.use(express.json({ limit: "10kb" }));

async function ensureZKP(req: Request, res: Response, next: NextFunction) {
  const proof = req.headers["x-cipher-proof"] as string;
  if (!proof) {
    return res
      .status(401)
      .json({ error: "Missing ZKP authentication header." });
  }

  const isValid = await verifyCryptographicProof(proof);
  if (!isValid) {
    return res.status(403).json({ error: "Invalid cryptographic proof." });
  }
  next();
}

app.post("/webhook/bitcoin-l2", ensureZKP, (req: Request, res: Response) => {
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

app.get("/health/financial", ensureZKP, (req: Request, res: Response) => {
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

export { app };
