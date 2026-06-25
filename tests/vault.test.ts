import request from 'supertest';
import { app } from '../vault/src/index';
import { generateCipherProof } from '../src/crypto/proofGenerator';

describe('806-Vault API', () => {
  const testHash = "806_panhandle_channel_secure_signature";
  const { cipherProof } = generateCipherProof(testHash);

  it('should deny access without ZKP header', async () => {
    const res = await request(app).get('/health/financial');
    expect(res.status).toBe(401);
  });

  it('should deny access with invalid ZKP header', async () => {
    const res = await request(app)
      .get('/health/financial')
      .set('x-cipher-proof', 'invalid-proof');
    expect(res.status).toBe(403);
  });

  it('should allow access with valid ZKP header to health', async () => {
    const res = await request(app)
      .get('/health/financial')
      .set('x-cipher-proof', cipherProof);
    expect(res.status).toBe(200);
    expect(res.body.component).toBe('806-Treasury');
  });

  it('should process Bitcoin L2 webhook with valid ZKP', async () => {
    const res = await request(app)
      .post('/webhook/bitcoin-l2')
      .set('x-cipher-proof', cipherProof)
      .send({
        txid: "0x123",
        amount: 1000,
        status: "confirmed"
      });
    expect(res.status).toBe(200);
    expect(res.body.confirmed).toBe(true);
  });
});
