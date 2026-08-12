import request from 'supertest';
import { app } from '../src/gatewayServer';
import { cache } from '../src/cache/redisPool';
import { sessionUpdateCache } from '../src/gateway/sessionMiddleware';

// Mock Redis/cache
jest.mock('../src/cache/redisPool', () => ({
  cache: {
    get: jest.fn(),
    setEx: jest.fn(),
    expire: jest.fn(),
    rawClient: {
        isOpen: true,
        quit: jest.fn()
    }
  }
}));

describe('Gateway Session Expire Throttling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionUpdateCache.clear();
  });

  it('should only call cache.expire once for multiple requests with the same hash within the 60s throttle window', async () => {
    const mockState = JSON.stringify({ identitySecured: true, originEpoch: Date.now() });

    // Setup mock to return the persistent state (cache hit)
    (cache.get as jest.Mock).mockResolvedValue(mockState);
    (cache.expire as jest.Mock).mockResolvedValue(true);

    const hash = 'test-session-hash';
    const proof = 'test-proof';

    // First request
    const response1 = await request(app)
      .post('/v1/channel/verify')
      .set('x-cipher-hash', hash)
      .set('x-cipher-proof', proof);

    expect(response1.status).toBe(200);
    expect(cache.expire).toHaveBeenCalledTimes(1);
    expect(cache.expire).toHaveBeenCalledWith(`state:${hash}`, 3600);

    // Second request with the same hash
    const response2 = await request(app)
      .post('/v1/channel/verify')
      .set('x-cipher-hash', hash)
      .set('x-cipher-proof', proof);

    expect(response2.status).toBe(200);
    // Should still have been called exactly once (throttled)
    expect(cache.expire).toHaveBeenCalledTimes(1);
  });

  it('should call cache.expire again if a different hash is verified', async () => {
    const mockState = JSON.stringify({ identitySecured: true, originEpoch: Date.now() });

    (cache.get as jest.Mock).mockResolvedValue(mockState);
    (cache.expire as jest.Mock).mockResolvedValue(true);

    const hash1 = 'session-hash-1';
    const hash2 = 'session-hash-2';
    const proof = 'test-proof';

    // Request with hash1
    const response1 = await request(app)
      .post('/v1/channel/verify')
      .set('x-cipher-hash', hash1)
      .set('x-cipher-proof', proof);

    expect(response1.status).toBe(200);
    expect(cache.expire).toHaveBeenCalledTimes(1);

    // Request with hash2
    const response2 = await request(app)
      .post('/v1/channel/verify')
      .set('x-cipher-hash', hash2)
      .set('x-cipher-proof', proof);

    expect(response2.status).toBe(200);
    expect(cache.expire).toHaveBeenCalledTimes(2);
  });
});
