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

// Bolt Optimization: Pre-compute HKDF info buffers to avoid repeated string templating and allocations
const HKDF_INFO_BUFFERS = Array.from({ length: 13 }, (_, i) => Buffer.from(`enc-${i}`, 'utf8'));

function deriveKey(master: Buffer, salt: Buffer, infoIndex: number): Buffer {
  // crypto.hkdfSync returns ArrayBuffer in Node 22+, Buffer.from(ArrayBuffer) creates a view without copying
  return Buffer.from(crypto.hkdfSync('sha256', master, salt, HKDF_INFO_BUFFERS[infoIndex], 32));
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

  // === 12 Hash-Lock Tubes (Integrity) ===
  // Bolt Optimization: Pre-compute hash once for all integrity tubes
  // Compatibility: use createHash for Node.js 20.0.0+ support
  const integrityHash = crypto.createHash('sha512').update(current).digest('hex');

  for (let i = 0; i < 12; i++) {
    const salt = crypto.randomBytes(16);
    hashChain.push(integrityHash);

    tubes.push({
      layer: i,
      type: 'hash-lock',
      salt: salt.toString('hex'),   // stored but not used for hashing in this design
      hash: integrityHash
    });

    audit.push(`Tube ${i}: SHA-512 hash lock computed for integrity`);
    // IMPORTANT: Do NOT replace current with hash → data remains recoverable
  }

  // === 13 AES-256-GCM Encryption Layers ===
  for (let j = 0; j < 13; j++) {
    const salt = crypto.randomBytes(16);
    const key = deriveKey(masterSeed, salt, j);
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

  // Bolt Optimization: Index tubes by layer for O(1) lookup
  // Using a single loop to avoid multiple array allocations from filter/map
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
      throw new Error(`Invalid tube metadata for layer ${12 + j}: Missing salt, iv, or tag`);
    }

    const iv = current.subarray(0, 12);
    const tag = current.subarray(12, 28);
    const encryptedData = current.subarray(28);

    const salt = Buffer.from(tube.salt, 'hex');
    const key = deriveKey(masterSeed, salt, j);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    current = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    audit.push(`Decrypted AES-256-GCM layer ${j}`);
  }

  // === Verify 12 hash-lock tubes in reverse ===
  // Bolt Optimization: Data is invariant during integrity checks, hoist hashing out of the loop
  // Compatibility: use createHash for Node.js 20.0.0+ support
  const computedBuffer = crypto.createHash('sha512').update(current).digest();

  for (let i = 11; i >= 0; i--) {
    const tube = tubeMap.get(i);
    if (!tube) throw new Error(`Missing hash-lock tube ${i}`);

    if (typeof tube.hash !== 'string') {
      throw new Error(`Invalid tube metadata for hash-lock ${i}: Missing hash`);
    }

    const expectedBuffer = Buffer.from(tube.hash, 'hex');

    // Sentinel: Use timingSafeEqual to prevent potential timing attacks on integrity checks
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
