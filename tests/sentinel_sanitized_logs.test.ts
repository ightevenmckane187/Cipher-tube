import { Request, Response } from 'express';
import { cipherTubeGateway } from '../src/gateway/sessionMiddleware';
import { verifyCryptographicProof } from '../src/crypto/verifier';

describe('Sanitized Error Logging Security Controls', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('should log sanitized error string in gateway middleware without leaking raw error object', async () => {
        const req = {
            headers: {
                'x-cipher-proof': 'valid_proof',
                'x-cipher-hash': 'valid_hash'
            }
        } as unknown as Request;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as unknown as Response;

        const next = jest.fn();

        // Create a custom error object with extra sensitive property
        const sensitiveError = new Error('Database connection failed');
        (sensitiveError as any).sensitiveCredential = 'secret_password_123';

        const { cache } = require('../src/cache/redisPool');
        jest.spyOn(cache, 'get').mockRejectedValueOnce(sensitiveError);

        await cipherTubeGateway(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(consoleErrorSpy).toHaveBeenCalled();
        const callArgs = consoleErrorSpy.mock.calls[0];
        // Ensure the second argument passed to console.error is a string (message), not the raw Error object
        expect(typeof callArgs[1]).toBe('string');
        expect(callArgs[1]).toBe('Database connection failed');
        expect(callArgs[1]).not.toContain('secret_password_123');
    });

    it('should log sanitized error string in verifyCryptographicProof on unexpected failure', async () => {
        const sensitiveError = new Error('Crypto subsystem failure');
        (sensitiveError as any).internalState = 'heap_dump_0x123';

        const crypto = require('crypto');
        const hmacSpy = jest.spyOn(crypto, 'createHmac').mockImplementationOnce(() => {
            throw sensitiveError;
        });

        const proof = {
            salt: Date.now(),
            structuralHash: 'test',
            challengeProof: 'abc'
        };
        const rawProof = Buffer.from(JSON.stringify(proof)).toString('base64');
        const result = await verifyCryptographicProof(rawProof);

        expect(result).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalled();
        const callArgs = consoleErrorSpy.mock.calls[0];
        expect(typeof callArgs[1]).toBe('string');
        expect(callArgs[1]).toBe('Crypto subsystem failure');

        hmacSpy.mockRestore();
    });
});
