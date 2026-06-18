import { header, body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../telemetry/logger';

/**
 * Validates and sanitizes incoming request results.
 */
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Request validation failed', { errors: errors.array(), path: req.path });
    return res.status(400).json({ status: 'failed', errors: errors.array() });
  }
  next();
};

/**
 * Strict sanitization for the core User ID header.
 */
export const sanitizeUserId = [
  header('x-user-id')
    .trim()
    .notEmpty().withMessage('User ID is required')
    .isLength({ max: 128 }).withMessage('User ID exceeds maximum length')
    .escape(),
  validate
];

/**
 * Sanitization for cryptographic gateway proofs.
 */
export const sanitizeCipherPayload = [
  header('x-cipher-proof')
    .trim()
    .notEmpty().withMessage('Cipher proof is required')
    .isBase64().withMessage('Cipher proof must be a valid base64 string'),
  header('x-cipher-hash')
    .trim()
    .notEmpty().withMessage('Cipher hash is required')
    .isHexadecimal().withMessage('Cipher hash must be hexadecimal'),
  validate
];

/**
 * Sanitization for CTA encryption/decryption payloads.
 */
export const sanitizeCtaPayload = [
  body('masterSeed')
    .trim()
    .isHexadecimal().withMessage('masterSeed must be hex')
    .isLength({ min: 64, max: 64 }).withMessage('masterSeed must be 256-bit'),
  validate
];
