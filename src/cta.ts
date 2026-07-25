import * as crypto from 'crypto';

// Constants for structural boundaries and cryptographic parameters
export const MAX_LAYERS = 100;
export const IV_LENGTH = 12;
export const TAG_LENGTH = 16;
export const EXPECTED_MIN_CIPHERTEXT_LENGTH = IV_LENGTH + TAG_LENGTH;

export interface AesTube {
  layer: number;
  type: 'aes-256-gcm';
  salt: string;
  iv: string;
  tag: string;
}

export interface HashLockTube {
  layer: number;
  type: 'hash-lock';
  hash: string;
}

export type Tube = AesTube | HashLockTube;

/**
 * Deterministic fast hash utilizing standard Node.js crypto APIs.
 * Guarantees consistent Buffer or hex string output.
 */
export function fastHash(
  algorithm: string,
  data: crypto.BinaryLike,
  encoding: 'hex' | 'buffer' = 'buffer'
): Buffer | string {
  const digest = crypto.createHash(algorithm).update(data).digest();
  return encoding === 'hex' ? digest.toString('hex') : digest;
}

/**
 * Derives a cryptographic key using HKDF, returning an explicit Buffer.
 */
function deriveKey(master: Buffer, salt: Buffer, info: string | Buffer): Buffer {
  return crypto.hkdfSync('sha256', master, salt, info, 32);
}

/**
 * Decrypts a Cipher Tube payload, validating structural boundaries,
 * layers, and cryptographic integrity.
 */
export function decryptCipherTube(
  tubes: Tube[],
  ciphertextHex: string,
  masterSeedHex: string
): { plaintext: string; seedHash: string } {
  // Validate masterSeed
  if (!masterSeedHex || typeof masterSeedHex !== 'string') {
    throw new Error('Invalid masterSeed: Must be a valid hex string');
  }
  const masterSeed = Buffer.from(masterSeedHex, 'hex');
  if (masterSeed.length !== 32) {
    throw new Error('Invalid masterSeed: Must be exactly 32 bytes');
  }

  // Validate tubes array bounds
  if (!Array.isArray(tubes) || tubes.length === 0 || tubes.length > MAX_LAYERS) {
    throw new Error(`Invalid tubes configuration: Must be between 1 and ${MAX_LAYERS} layers`);
  }

  // Validate ciphertext hex format and minimum length
  if (!/^[0-9a-fA-F]+$/.test(ciphertextHex) || ciphertextHex.length % 2 !== 0) {
    throw new Error('Invalid ciphertext: Malformed hex string');
  }

  let current: Buffer = Buffer.from(ciphertextHex, 'hex');
  if (current.length < EXPECTED_MIN_CIPHERTEXT_LENGTH) {
    throw new Error('Invalid ciphertext: Payload too short');
  }

  const seedHash = (fastHash('sha256', masterSeed, 'hex') as string);
  const poolHashes: Buffer[] = [];

  // Process decryption layers in reverse
  for (let i = tubes.length - 1; i >= 0; i--) {
    const tube = tubes[i];
    
    if (tube.type === 'hash-lock') {
      const computedHashBuffer = fastHash('sha512', current, 'buffer') as Buffer;
      const expectedHashBuffer = Buffer.from(tube.hash, 'hex');
      
      if (
        computedHashBuffer.length !== expectedHashBuffer.length ||
        !crypto.timingSafeEqual(computedHashBuffer, expectedHashBuffer)
      ) {
        throw new Error(`Integrity check failed at layer ${tube.layer}`);
      }
      poolHashes.push(computedHashBuffer);
    } else if (tube.type === 'aes-256-gcm') {
      const salt = Buffer.from((tube as AesTube).salt, 'hex');
      const iv = Buffer.from((tube as AesTube).iv, 'hex');
      const tag = Buffer.from((tube as AesTube).tag, 'hex');

      if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
        throw new Error(`Invalid AES parameters at layer ${tube.layer}`);
      }

      if (current.length < IV_LENGTH + TAG_LENGTH) {
        throw new Error(`Ciphertext truncated at layer ${tube.layer}`);
      }

      // Unpack ciphertext structure: [IV (12)] [Tag (16)] [Encrypted Data (...)]
      const actualIv = current.subarray(0, IV_LENGTH);
      const actualTag = current.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const encryptedData = current.subarray(IV_LENGTH + TAG_LENGTH);

      const key = deriveKey(masterSeed, salt, `layer-${(tube as AesTube).layer}`);

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, actualIv);
      decipher.setAuthTag(actualTag);

      try {
        const decrypted = Buffer.concat([
          decipher.update(encryptedData),
          decipher.final()
        ]);
        current = decrypted;
      } catch {
        throw new Error(`Decryption failed or payload tampered at layer ${tube.layer}`);
      }
    } else {
      throw new Error(`Unknown tube type at layer ${tube.layer}`);
    }
  }

  return {
    plaintext: current.toString('utf8'),
    seedHash
  };
}
