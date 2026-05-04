import crypto from 'crypto';

export interface Tube {
  layer: number;
  type: 'hash-lock' | 'aes-256-gcm';
  salt: string;
  hash?: string;
  iv?: string;
  tag?: string;
}

export interface CipherTubeResult {
  ciphertext: string;
  tubes: Tube[];
  hashChain?: string[];           // optional, for extra verification
  audit: {
    whatHappened: string[];
    timestamp: string;
    seedHash: string;
  };
}

// Bolt Optimization: Pre-compute HKDF info buffers for up to 100 layers
const ENCRYPTION_INFOS = Array.from({ length: 100 }, (_, i) => Buffer.from(`enc-${i}`));

// Bolt Optimization: Pre-compute audit strings to avoid repeated string interpolations
const AUDIT_TUBE_INTEGRITY = Array.from({ length: 100 }, (_, i) => `Tube ${i}: SHA-512 hash lock computed for integrity`);
const AUDIT_LAYER_ENCRYPTION = Array.from({ length: 100 }, (_, i) => `Layer ${i}: AES-256-GCM encryption applied`);
const AUDIT_DECRYPTED_LAYER = Array.from({ length: 100 }, (_, i) => `Decrypted AES-256-GCM layer ${i}`);
const AUDIT_VERIFIED_TUBE = Array.from({ length: 100 }, (_, i) => `Verified hash-lock tube ${i}`);

function deriveKey(master: Buffer, salt: Buffer, info: string | Buffer): Buffer {
  return Buffer.from(crypto.hkdfSync('sha256', master, salt, info, 32));
}

/**
 * Builds the full Cipher Tube Assembly:
 * - 12 Hash-Lock Tubes (integrity verification only)
 * - 13 AES-256-GCM Encryption Layers
 */
export function buildCipherTube(plaintext: Buffer, masterSeed: Buffer): CipherTubeResult {
  let current = plaintext;
  const tubes: Tube[] = [];
  const audit: string[] = [];
  const hashChain: string[] = [];

  // Bolt Optimization: Consolidate 38 entropy calls into one 556-byte pool
  // 12 salts (16B) + 13 salts (16B) + 13 IVs (12B) = 556 bytes
  const entropy = crypto.randomBytes(556);
  let entropyOffset = 0;

  // === 12 Hash-Lock Tubes (Integrity) ===
  // Bolt Optimization: Pre-compute hash once for all integrity tubes
  const integrityHash = crypto.createHash('sha512').update(current).digest('hex');

  for (let i = 0; i < 12; i++) {
    const salt = entropy.subarray(entropyOffset, entropyOffset + 16);
    entropyOffset += 16;
    hashChain.push(integrityHash);

    tubes.push({
      layer: i,
      type: 'hash-lock',
      salt: salt.toString('hex'),   // stored but not used for hashing in this design
      hash: integrityHash
    });

    audit.push(AUDIT_TUBE_INTEGRITY[i] || `Tube ${i}: SHA-512 hash lock computed for integrity`);
    // IMPORTANT: Do NOT replace current with hash → data remains recoverable
  }

  // === 13 AES-256-GCM Encryption Layers ===
  for (let j = 0; j < 13; j++) {
    const layerId = 12 + j;
    const salt = entropy.subarray(entropyOffset, entropyOffset + 16);
    entropyOffset += 16;
    const info = ENCRYPTION_INFOS[j] || `enc-${j}`;
    const key = deriveKey(masterSeed, salt, info);
    const iv = entropy.subarray(entropyOffset, entropyOffset + 12);
    entropyOffset += 12;

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const update = cipher.update(current);
    const final = cipher.final();
    const tag = cipher.getAuthTag();

    // Bolt Optimization: Concatenate everything at once to reduce intermediate allocations
    current = Buffer.concat([iv, tag, update, final]);

    tubes.push({
      layer: layerId,
      type: 'aes-256-gcm',
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    });

    audit.push(AUDIT_LAYER_ENCRYPTION[layerId] || `Layer ${layerId}: AES-256-GCM encryption applied`);
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
  tubes: Tube[]
) {
  // Sentinel: Validate hex input and even length
  if (!/^[0-9a-f]*$/i.test(ciphertextHex) || ciphertextHex.length % 2 !== 0) {
    throw new Error('Invalid ciphertext: Not a valid hex string or invalid length');
  }

  // Sentinel: Validate masterSeed length (256-bit entropy required)
  if (masterSeed.length !== 32) {
    throw new Error('Invalid masterSeed: Must be exactly 32 bytes');
  }

  // Sentinel: Limit tubes array size to prevent DoS via resource exhaustion
  if (!Array.isArray(tubes) || tubes.length > 100) {
    throw new Error('Invalid tubes metadata: Missing, invalid, or too many layers');
  }

  let current = Buffer.from(ciphertextHex, 'hex');

  // Sentinel: Basic length check. 13 layers * (12 IV + 16 TAG) = 364 bytes min
  if (current.length < 364) {
    throw new Error('Invalid ciphertext: Too short for 13 encryption layers');
  }

  const audit: string[] = [];

  // Bolt Optimization: Use a single loop to build the tube map, avoiding intermediate arrays
  const tubeMap = new Map<number, Tube>();
  for (const tube of tubes) {
    if (tube && typeof tube === 'object' && typeof tube.layer === 'number') {
      tubeMap.set(tube.layer, tube);
    }
  }

  // === Decrypt 13 encryption layers in reverse ===
  for (let j = 12; j >= 0; j--) {
    const layerId = 12 + j;
    const tube = tubeMap.get(layerId);
    if (!tube) throw new Error(`Missing encryption tube for layer ${layerId}`);

    // Sentinel: Validate tube fields
    if (typeof tube.salt !== 'string' || typeof tube.iv !== 'string' || typeof tube.tag !== 'string') {
      throw new Error(`Invalid tube metadata for layer ${layerId}: Missing salt, iv, or tag`);
    }

    const iv = current.subarray(0, 12);
    const tag = current.subarray(12, 28);
    const encryptedData = current.subarray(28);

    const salt = Buffer.from(tube.salt, 'hex');
    const info = ENCRYPTION_INFOS[j] || `enc-${j}`;
    const key = deriveKey(masterSeed, salt, info);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const update = decipher.update(encryptedData);
    const final = decipher.final();

    // Bolt Optimization: Avoid Buffer.concat if final block is empty (common for GCM)
    current = final.length === 0 ? update : Buffer.concat([update, final]);
    audit.push(AUDIT_DECRYPTED_LAYER[j] || `Decrypted AES-256-GCM layer ${j}`);
  }

  // === Verify 12 hash-lock tubes in reverse ===
  // Bolt Optimization: Hoist SHA-512 hash calculation as 'current' remains constant during this phase
  const computedHashBuffer = crypto.createHash('sha512').update(current).digest();

  // Bolt Optimization: Cache converted hash Buffers to avoid repeated hex-to-Buffer overhead
  const hashCache = new Map<string, Buffer>();

  for (let i = 11; i >= 0; i--) {
    const tube = tubeMap.get(i);
    if (!tube) throw new Error(`Missing hash-lock tube ${i}`);

    if (typeof tube.hash !== 'string') {
      throw new Error(`Invalid tube metadata for hash-lock ${i}: Missing hash`);
    }

    let expectedBuffer = hashCache.get(tube.hash);
    if (!expectedBuffer) {
      expectedBuffer = Buffer.from(tube.hash, 'hex');
      hashCache.set(tube.hash, expectedBuffer);
    }

    // Sentinel: Use timingSafeEqual to prevent potential timing attacks on integrity checks
    if (computedHashBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(computedHashBuffer, expectedBuffer)) {
      throw new Error(`Integrity check failed: Hash-lock tube ${i} mismatch`);
    }

    audit.push(AUDIT_VERIFIED_TUBE[i] || `Verified hash-lock tube ${i}`);
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
