import request from 'supertest';
import { app, redisClient, sessionCache } from '../src/server';
import crypto from 'crypto';

jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe('CTA API Integration', () => {
  const userId = 'test-user-123';
  const masterSeed = crypto.randomBytes(32).toString('hex');
  let sessionId: string;
  let redisMock: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const { createClient } = require('redis');
    redisMock = createClient();

    // Create a session to use for tests
    const response = await request(app)
      .post('/mcp')
      .set('x-user-id', userId);

    sessionId = response.body.sessionId;
  });

  beforeEach(() => {
    redisMock.get.mockImplementation((key: string) => {
        return Promise.resolve(userId);
    });
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  describe('POST /mcp/:sessionId/encrypt', () => {
    it('should successfully encrypt a message', async () => {
      redisMock.get.mockResolvedValueOnce(userId);
      const message = 'Secret message';
      const response = await request(app)
        .post(`/mcp/${sessionId}/encrypt`)
        .set('x-user-id', userId)
        .send({ message, masterSeed });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ciphertext');
      expect(response.body).toHaveProperty('tubes');
      expect(response.body.tubes).toHaveLength(25);
    });

    it('should return 403 if user does not own the session', async () => {
      redisMock.get.mockResolvedValueOnce('another-user');
      sessionCache.clear();

      const response = await request(app)
        .post(`/mcp/${sessionId}/encrypt`)
        .set('x-user-id', 'wrong-user')
        .send({ message: 'test', masterSeed });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /mcp/:sessionId/decrypt', () => {
    let encryptionResult: any;

    beforeAll(async () => {
      redisMock.get.mockResolvedValueOnce(userId);
      const response = await request(app)
        .post(`/mcp/${sessionId}/encrypt`)
        .set('x-user-id', userId)
        .send({ message: 'Hello world', masterSeed });

      encryptionResult = response.body;
    });

    it('should successfully decrypt a message', async () => {
      redisMock.get.mockResolvedValueOnce(userId);
      const response = await request(app)
        .post(`/mcp/${sessionId}/decrypt`)
        .set('x-user-id', userId)
        .send({
          ciphertext: encryptionResult.ciphertext,
          tubes: encryptionResult.tubes,
          masterSeed
        });

      expect(response.status).toBe(200);
      expect(response.body.plaintext).toBe('Hello world');
      expect(response.body.audit.success).toBe(true);
    });

    it('should return 400 if integrity check fails (tampered tubes)', async () => {
      redisMock.get.mockResolvedValueOnce(userId);
      const tamperedTubes = [...encryptionResult.tubes];
      tamperedTubes[0] = { ...tamperedTubes[0], hash: 'wrong-hash' };

      const response = await request(app)
        .post(`/mcp/${sessionId}/decrypt`)
        .set('x-user-id', userId)
        .send({
          ciphertext: encryptionResult.ciphertext,
          tubes: tamperedTubes,
          masterSeed
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Integrity check failed');
    });

    it('should return 400 if masterSeed is wrong', async () => {
      redisMock.get.mockResolvedValueOnce(userId);
      const wrongSeed = crypto.randomBytes(32).toString('hex');
      const response = await request(app)
        .post(`/mcp/${sessionId}/decrypt`)
        .set('x-user-id', userId)
        .send({
          ciphertext: encryptionResult.ciphertext,
          tubes: encryptionResult.tubes,
          masterSeed: wrongSeed
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Decryption failed');
    });
  });
});
