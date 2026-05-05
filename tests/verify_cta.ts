import crypto from 'crypto';
import { buildCipherTube, decryptCipherTube } from '../src/cta';

async function verify() {
    console.log('Starting CTA functional verification...');
    const masterSeed = crypto.randomBytes(32);
    const plaintext = 'Lightning fast encryption by Bolt ⚡';

    console.log('1. Testing standard encryption/decryption cycle...');
    const result = buildCipherTube(Buffer.from(plaintext, 'utf8'), masterSeed);
    const decrypted = decryptCipherTube(result.ciphertext, masterSeed, result.tubes);

    if (decrypted.plaintext !== plaintext) {
        throw new Error(`Plaintext mismatch! Expected: "${plaintext}", Got: "${decrypted.plaintext}"`);
    }
    console.log('✅ Cycle successful.');

    console.log('2. Verifying audit log completeness...');
    if (result.audit.whatHappened.length !== 25) {
        throw new Error(`Audit log length mismatch! Expected 25 entries, got ${result.audit.whatHappened.length}`);
    }
    console.log('✅ Audit log verified.');

    console.log('3. Verifying tube structure...');
    if (result.tubes.length !== 25) {
        throw new Error(`Tube count mismatch! Expected 25, got ${result.tubes.length}`);
    }
    console.log('✅ Tube structure verified.');

    console.log('\nVerification complete: Cipher Tube Assembly is fully functional after optimization.');
}

verify().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
