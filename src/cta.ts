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

const NUM_INTEGRITY_TUBES = 12;
const NUM_ENCRYPTION_LAYERS = 13;

// Bolt Optimization: Pre-compute HKDF info buffers for up to 100 layers
const ENCRYPTION_INFOS = Array.from({ length: 100 }, (_, i) => Buffer.from(`enc-${i}`));

// Bolt Optimization: Pre-compute audit log strings to avoid repeated interpolations
const AUDIT_TUBE_INTEGRITY = Array.from({ length: NUM_INTEGRITY_TUBES }, (_, i) => `Tube ${i}: SHA-512 hash lock computed for integrity`);
const AUDIT_LAYER_ENCRYPTION = Array.from({ length: NUM_ENCRYPTION_LAYERS }, (_, i) => `Layer ${NUM_INTEGRITY_TUBES + i}: AES-256-GCM encryption applied`);
const AUDIT_DECRYPT_LAYER = Array.from({ length: NUM_ENCRYPTION_LAYERS }, (_, i) => `Decrypted AES-256-GCM layer ${i}`);
const AUDIT_VERIFY_TUBE = Array.from({ length: NUM_INTEGRITY_TUBES }, (_, i) => `Verified hash-lock tube ${i}`);

function deriveKey(master: Buffer, salt: Buffer, info: string | Buffer): ArrayBuffer {
  return crypto.hkdfSync('sha256', master, salt, info, 32);
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

  // Bolt Optimization: Consolidate entropy generation.
  // NUM_INTEGRITY_TUBES * 16B (salt) + NUM_ENCRYPTION_LAYERS * 16B (salt) + NUM_ENCRYPTION_LAYERS * 12B (iv)
  const entropyNeeded = (NUM_INTEGRITY_TUBES * 16) + (NUM_ENCRYPTION_LAYERS * 16) + (NUM_ENCRYPTION_LAYERS * 12);
  const entropyPool = crypto.randomBytes(entropyNeeded);
  let entropyOffset = 0;

  // === 12 Hash-Lock Tubes (Integrity) ===
  // Bolt Optimization: Use standard hashing for compatibility
  const integrityHash = crypto.createHash('sha512').update(current).digest('hex');

  // Bolt Optimization: Convert entropy pool to hex once to avoid repeated conversions in loops
  const entropyHex = entropyPool.toString('hex');

  for (let i = 0; i < NUM_INTEGRITY_TUBES; i++) {
    const saltHex = entropyHex.substring(entropyOffset * 2, entropyOffset * 2 + 32);
    entropyOffset += 16;

    hashChain.push(integrityHash);

    tubes.push({
      layer: i,
      type: 'hash-lock',
      salt: saltHex,
      hash: integrityHash
    });

    audit.push(AUDIT_TUBE_INTEGRITY[i]);
    // IMPORTANT: Do NOT replace current with hash → data remains recoverable
  }

  // === 13 AES-256-GCM Encryption Layers ===
  for (let j = 0; j < NUM_ENCRYPTION_LAYERS; j++) {
    const layerId = NUM_INTEGRITY_TUBES + j;
    const salt = entropyPool.subarray(entropyOffset, entropyOffset + 16);
    const saltHex = entropyHex.substring(entropyOffset * 2, entropyOffset * 2 + 32);
    entropyOffset += 16;
    const iv = entropyPool.subarray(entropyOffset, entropyOffset + 12);
    const ivHex = entropyHex.substring(entropyOffset * 2, entropyOffset * 2 + 24);
    entropyOffset += 12;

    const info = ENCRYPTION_INFOS[j] || `enc-${j}`;
    const key = deriveKey(masterSeed, salt, info);

    // Bolt Optimization: Use ArrayBuffer directly from deriveKey
    const cipher = crypto.createCipheriv('aes-256-gcm', new Uint8Array(key), iv);
    const ciphertext = cipher.update(current);
    cipher.final(); // Must call final() before getAuthTag() even if it returns empty buffer
    const tag = cipher.getAuthTag();

    // Bolt Optimization: Avoid Buffer.concat if final is empty (common for GCM)
    current = final.length > 0 ? Buffer.concat([iv, tag, update, final]) : Buffer.concat([iv, tag, update]);

    tubes.push({
      layer: layerId,
      type: 'aes-256-gcm',
      salt: saltHex,
      iv: ivHex,
      tag: tag.toString('hex')
    });

    audit.push(AUDIT_LAYER_ENCRYPTION[j]);
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
 *
 * BOLT OPTIMIZATION:
 * Used Map-based lookup for tubes instead of Array.find() to reduce complexity from O(L*N) to O(L).
 * Where L is the number of layers (25) and N is the number of tubes (25).
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

  // Bolt Optimization: Use a fixed-size array for O(1) lookups instead of a Map
  const tubePool: { tube: Tube; salt: Buffer | null; hash: Buffer | null }[] = new Array(101);
  for (const tube of tubes) {
    if (!tube || typeof tube !== 'object' || typeof tube.layer !== 'number') continue;
    const layer = tube.layer;
    if (layer < 0 || layer > 100) continue;

    tubePool[layer] = {
      tube,
      salt: typeof tube.salt === 'string' ? Buffer.from(tube.salt, 'hex') : null,
      hash: typeof tube.hash === 'string' ? Buffer.from(tube.hash, 'hex') : null
    };
  }

  // === Decrypt 13 encryption layers in reverse ===
  for (let j = NUM_ENCRYPTION_LAYERS - 1; j >= 0; j--) {
    const layerId = NUM_INTEGRITY_TUBES + j;
    const entry = tubePool[layerId];
    if (!entry) throw new Error(`Missing encryption tube for layer ${layerId}`);
    const tube = entry.tube;

    // Sentinel: Validate tube fields
    if (typeof tube.salt !== 'string' || typeof tube.iv !== 'string' || typeof tube.tag !== 'string') {
      throw new Error(`Invalid tube metadata for layer ${layerId}: Missing salt, iv, or tag`);
    }

    const iv = current.subarray(0, 12);
    const tag = current.subarray(12, 28);
    const encryptedData = current.subarray(28);

    const salt = entry.salt;
    if (!salt) throw new Error(`Invalid tube metadata for layer ${layerId}: Missing salt`);
    const info = ENCRYPTION_INFOS[j] || `enc-${j}`;
    const key = deriveKey(masterSeed, salt, info);

    // Bolt Optimization: Use ArrayBuffer key
    const decipher = crypto.createDecipheriv('aes-256-gcm', new Uint8Array(key), iv);
    decipher.setAuthTag(tag);

    const decUpdate = decipher.update(encryptedData);
    const decFinal = decipher.final();
    // Bolt Optimization: Avoid Buffer.concat if decFinal is empty
    current = decFinal.length > 0 ? Buffer.concat([decUpdate, decFinal]) : decUpdate;
    audit.push(AUDIT_DECRYPT_LAYER[j]);
  }

  // === Verify 12 hash-lock tubes in reverse ===
  // Bolt Optimization: Use standard hashing for compatibility with Node.js LTS versions
  const computedHashBuffer = crypto.createHash('sha512').update(current).digest();
  let lastHash: string | undefined;
  let lastVerified = false;

  for (let i = NUM_INTEGRITY_TUBES - 1; i >= 0; i--) {
    const entry = tubePool[i];
    if (!entry) throw new Error(`Missing hash-lock tube ${i}`);
    const tube = entry.tube;

    if (typeof tube.hash !== 'string') {
      throw new Error(`Invalid tube metadata for hash-lock ${i}: Missing hash`);
    }

    // Bolt Optimization: Short-circuit if this hash was already verified in the previous layer
    if (tube.hash === lastHash && lastVerified) {
      audit.push(AUDIT_VERIFY_TUBE[i]);
      continue;
    }

    const expectedBuffer = entry.hash;
    if (!expectedBuffer) {
      throw new Error(`Invalid tube metadata for hash-lock ${i}: Missing hash buffer`);
    }

    // Sentinel: Use timingSafeEqual to prevent potential timing attacks on integrity checks
    if (computedHashBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(computedHashBuffer, expectedBuffer)) {
      throw new Error(`Integrity check failed: Hash-lock tube ${i} mismatch`);
    }

    lastHash = tube.hash;
    lastVerified = true;
    audit.push(AUDIT_VERIFY_TUBE[i]);
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
