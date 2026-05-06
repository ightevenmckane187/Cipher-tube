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

// Bolt Optimization: Pre-compute constants
const NUM_INTEGRITY_TUBES = 12;
const NUM_ENCRYPTION_LAYERS = 13;
const ENCRYPTION_INFOS = Array.from({ length: 100 }, (_, i) => Buffer.from(`enc-${i}`));
const AUDIT_TUBE_INTEGRITY = Array.from({ length: NUM_INTEGRITY_TUBES }, (_, i) => `Tube ${i}: SHA-512 hash lock computed for integrity`);
const AUDIT_LAYER_ENCRYPTION = Array.from({ length: NUM_ENCRYPTION_LAYERS }, (_, i) => `Layer ${NUM_INTEGRITY_TUBES + i}: AES-256-GCM encryption applied`);

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

  // Bolt Optimization: Use a single entropy pool for all salts and IVs (556 bytes total)
  // (NUM_INTEGRITY_TUBES + NUM_ENCRYPTION_LAYERS) * 16 bytes for salts + NUM_ENCRYPTION_LAYERS * 12 bytes for IVs
  const totalEntropyNeeded = (NUM_INTEGRITY_TUBES + NUM_ENCRYPTION_LAYERS) * 16 + NUM_ENCRYPTION_LAYERS * 12;
  const entropyPool = crypto.randomBytes(totalEntropyNeeded);
  let entropyOffset = 0;

  // === 12 Hash-Lock Tubes (Integrity) ===
  // Bolt Optimization: Use one-shot crypto.hash() for efficiency (Node.js 22+)
  const integrityHash = (crypto as any).hash('sha512', current, 'hex');

  for (let i = 0; i < NUM_INTEGRITY_TUBES; i++) {
    const salt = entropyPool.subarray(entropyOffset, entropyOffset + 16);
    entropyOffset += 16;

    hashChain.push(integrityHash);

    tubes.push({
      layer: i,
      type: 'hash-lock',
      salt: salt.toString('hex'),
      hash: integrityHash
    });

    audit.push(AUDIT_TUBE_INTEGRITY[i]);
  }

  // === 13 AES-256-GCM Encryption Layers ===
  for (let j = 0; j < NUM_ENCRYPTION_LAYERS; j++) {
    const layerId = NUM_INTEGRITY_TUBES + j;
    const salt = entropyPool.subarray(entropyOffset, entropyOffset + 16);
    entropyOffset += 16;
    const iv = entropyPool.subarray(entropyOffset, entropyOffset + 12);
    entropyOffset += 12;

    const info = ENCRYPTION_INFOS[j] || `enc-${j}`;
    const key = deriveKey(masterSeed, salt, info);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(current), cipher.final()]);
    const tag = cipher.getAuthTag();

    current = Buffer.concat([iv, tag, encrypted]);

    tubes.push({
      layer: layerId,
      type: 'aes-256-gcm',
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
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
      seedHash: (crypto as any).hash('sha256', masterSeed, 'hex')
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
  for (let j = NUM_ENCRYPTION_LAYERS - 1; j >= 0; j--) {
    const layerId = NUM_INTEGRITY_TUBES + j;
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

    current = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    audit.push(`Decrypted AES-256-GCM layer ${j}`);
  }

  // === Verify 12 hash-lock tubes in reverse ===
  // Bolt Optimization: Hoist SHA-512 hash calculation as 'current' remains constant during this phase
  const computedHashBuffer = Buffer.from((crypto as any).hash('sha512', current, 'buffer'));

  for (let i = NUM_INTEGRITY_TUBES - 1; i >= 0; i--) {
    const tube = tubeMap.get(i);
    if (!tube) throw new Error(`Missing hash-lock tube ${i}`);

    if (typeof tube.hash !== 'string') {
      throw new Error(`Invalid tube metadata for hash-lock ${i}: Missing hash`);
    }

    // Bolt Optimization: Use Buffers directly to avoid unnecessary hex string conversions
    const expectedBuffer = Buffer.from(tube.hash, 'hex');

    // Sentinel: Use timingSafeEqual to prevent potential timing attacks on integrity checks
    if (computedHashBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(computedHashBuffer, expectedBuffer)) {
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
