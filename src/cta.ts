import crypto from 'crypto';

export interface CipherTubeResult {
  ciphertext: string;
  tubes: any[];
  hashChain?: string[];           // optional, for extra verification
  audit: {
    whatHappened: string[];
    timestamp: string;
    seedHash: string;
  };
}

function deriveKey(master: Buffer, salt: Buffer, info: string): Buffer {
  return Buffer.from(crypto.hkdfSync('sha256', master, salt, info, 32));
}

/**
 * Builds the full Cipher Tube Assembly:
 * - 12 Hash-Lock Tubes (integrity verification only)
 * - 13 AES-256-GCM Encryption Layers
 */
export function buildCipherTube(plaintext: Buffer, masterSeed: Buffer): CipherTubeResult {
  let current = plaintext;
  const tubes: any[] = [];
  const audit: string[] = [];
  const hashChain: string[] = [];

  // === 12 Hash-Lock Tubes (Integrity) ===
  for (let i = 0; i < 12; i++) {
    const salt = crypto.randomBytes(16);
    const hash = crypto.createHash('sha512').update(current).digest('hex');

    hashChain.push(hash);

    tubes.push({
      layer: i,
      type: 'hash-lock',
      salt: salt.toString('hex'),   // stored but not used for hashing in this design
      hash: hash
    });

    audit.push(`Tube ${i}: SHA-512 hash lock computed for integrity`);
    // IMPORTANT: Do NOT replace current with hash → data remains recoverable
  }

  // === 13 AES-256-GCM Encryption Layers ===
  for (let j = 0; j < 13; j++) {
    const salt = crypto.randomBytes(16);
    const key = deriveKey(masterSeed, salt, `enc-${j}`);
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(current), cipher.final()]);
    const tag = cipher.getAuthTag();

    current = Buffer.concat([iv, tag, encrypted]);

    tubes.push({
      layer: 12 + j,
      type: 'aes-256-gcm',
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    });

    audit.push(`Layer ${12 + j}: AES-256-GCM encryption applied`);
  }

  return {
    ciphertext: current.toString('hex'),
    tubes,
    hashChain,
    audit: {
      whatHappened: audit,
      timestamp: new Date().toISOString(),
      seedHash: crypto.createHash('sha256').update(masterSeed).digest('hex')
    }
  };
}

/**
 * Decrypts and verifies the full Cipher Tube
 */
export function decryptCipherTube(
  ciphertextHex: string,
  masterSeed: Buffer,
  tubes: any[]
) {
  // Sentinel: Basic validation for tubes and ciphertext length
  if (!/^[0-9a-f]+$/i.test(ciphertextHex)) {
    throw new Error('Invalid ciphertext format: must be hex');
  }

  let current = Buffer.from(ciphertextHex, 'hex');

  // 13 layers * (12 bytes IV + 16 bytes Tag) = 364 bytes minimum overhead
  if (current.length < 364) {
    throw new Error('Ciphertext is too short for 13 layers of assembly');
  }

  if (tubes.length < 25) {
    throw new Error('Invalid tube assembly: missing required layers');
  }

  const audit: string[] = [];

  // === Decrypt 13 encryption layers in reverse ===
  for (let j = 12; j >= 0; j--) {
    const tube = tubes.find((t: any) => t.layer === 12 + j);
    if (!tube) throw new Error(`Missing encryption tube for layer ${12 + j}`);

    const iv = current.subarray(0, 12);
    const tag = current.subarray(12, 28);
    const encryptedData = current.subarray(28);

    const salt = Buffer.from(tube.salt, 'hex');
    const key = deriveKey(masterSeed, salt, `enc-${j}`);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    current = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    audit.push(`Decrypted AES-256-GCM layer ${j}`);
  }

  // === Verify 12 hash-lock tubes in reverse ===
  for (let i = 11; i >= 0; i--) {
    const tube = tubes.find((t: any) => t.layer === i);
    if (!tube) throw new Error(`Missing hash-lock tube ${i}`);

    const computedHash = crypto.createHash('sha512').update(current).digest('hex');

    // Sentinel: Use timingSafeEqual to prevent potential timing attacks on integrity checks
    const computedBuffer = Buffer.from(computedHash, 'hex');
    const expectedBuffer = Buffer.from(tube.hash, 'hex');

    if (computedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(computedBuffer, expectedBuffer)) {
      throw new Error(`Integrity check failed: Hash-lock tube ${i} mismatch`);
    }

    audit.push(`Verified hash-lock tube ${i}`);
  }

  return {
    plaintext: current.toString('utf8'),
    audit: {
      whatHappened: audit,
      success: true,
      timestamp: new Date().toISOString()
    }
  };
}
