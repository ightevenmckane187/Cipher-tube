import request from 'supertest';
import { app, redisClient, sessionCache } from '../src/server';
import { executeWorkflow, ExecContext } from '../src/engine/runtime/orchestrator';
import { getBlindedRedisKey } from '../src/session_rotator';

// Mock Redis client
jest.mock('redis', () => {
  const mRedis = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    expire: jest.fn().mockResolvedValue(true),
    quit: jest.fn().mockResolvedValue('OK'),
  };
  return {
    createClient: jest.fn(() => mRedis),
  };
});

describe('Sentinel Security Fixes', () => {
  let redisMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionCache.clear();
    const { createClient } = require('redis');
    redisMock = createClient();
  });

  describe('Orchestrator: Template Injection & Prototype Pollution', () => {
    const ctx: ExecContext = {
      actions: {
        test: {
          echo: async (params: any) => params
        }
      },
      config: {
        secret: 'password123',
        nested: { val: 'nested-val' }
      }
    };

    it('should prevent template injection (double expansion)', async () => {
      const workflow = {
        name: 'injection-test',
        steps: [
          {
            action: 'test.echo',
            params: {
              data: '${params.input}'
            },
            output: 'result'
          }
        ]
      };

      // Input contains a template string that should NOT be expanded
      const params = { input: '${config.secret}' };
      const state = await executeWorkflow(workflow, ctx, params);

      expect(state.result.data).toBe('${config.secret}');
      expect(state.result.data).not.toBe('password123');
    });

    it('should prevent prototype pollution via __proto__', async () => {
        const workflow = {
          name: 'proto-pollution-test',
          steps: [
            {
              action: 'test.echo',
              params: {
                data: '${config.__proto__.polluted}'
              },
              output: 'result'
            }
          ]
        };

        (Object.prototype as any).polluted = 'oops';
        const state = await executeWorkflow(workflow, ctx);
        delete (Object.prototype as any).polluted;

        expect(state.result.data).toBeUndefined();
    });

    it('should correctly resolve deep paths and preserve types for direct matches', async () => {
        const workflow = {
          name: 'deep-path-test',
          steps: [
            {
              action: 'test.echo',
              params: {
                obj: '${config.nested}',
                val: '${config.nested.val}'
              },
              output: 'result'
            }
          ]
        };

        const state = await executeWorkflow(workflow, ctx);
        expect(state.result.obj).toEqual({ val: 'nested-val' });
        expect(state.result.val).toBe('nested-val');
    });
  });

  describe('Server: Session Activity Refresh & Extension', () => {
    const userId = 'sentinel-user';
    const sessionId = '550e8400-e29b-41d4-a716-446655440000';

    beforeEach(() => {
        redisMock.get.mockResolvedValue(userId);
    });

    it('should extend Redis TTL on every authorized request (Activity Refresh)', async () => {
        const blindedKey = getBlindedRedisKey(sessionId);
        redisMock.get.mockImplementation((key: string) => {
            if (key === blindedKey) return Promise.resolve(userId);
            return Promise.resolve(null);
        });

        await request(app)
            .get(`/mcp/${sessionId}/check`)
            .set('x-user-id', userId);

        expect(redisMock.expire).toHaveBeenCalledWith(blindedKey, 3600);
    });

    it('should allow explicit session extension via POST /session/:sessionId/extend', async () => {
        const blindedKey = getBlindedRedisKey(sessionId);
        redisMock.get.mockImplementation((key: string) => {
            if (key === blindedKey) return Promise.resolve(userId);
            return Promise.resolve(null);
        });

        const response = await request(app)
            .post(`/session/${sessionId}/extend`)
            .set('x-user-id', userId);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Session extended successfully');
        expect(response.body.expiresIn).toBe(3600);
        expect(redisMock.expire).toHaveBeenCalledWith(blindedKey, 3600);
    });
  });
});
