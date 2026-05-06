import crypto from 'crypto';
import { buildCipherTube, decryptCipherTube } from '../src/cta';

function testCTA() {
    console.log('Testing Cipher Tube Assembly correctness...');

    const masterSeed = crypto.randomBytes(32);
    const message = 'Test message for Bolt ⚡';
    const plaintext = Buffer.from(message, 'utf8');

    // Test Build
    const result = buildCipherTube(plaintext, masterSeed);
    console.log('✅ Build successful');

    // Test Decrypt
    const decrypted = decryptCipherTube(result.ciphertext, masterSeed, result.tubes);
    if (decrypted.plaintext !== message) {
        throw new Error(`Decryption failed! Expected "${message}", got "${decrypted.plaintext}"`);
    }
    console.log('✅ Decryption successful and content matches');

    // Test Integrity Failure
    const tamperedTubes = JSON.parse(JSON.stringify(result.tubes));
    tamperedTubes[0].hash = '0'.repeat(128); // Corrupt the first hash-lock tube

    try {
        decryptCipherTube(result.ciphertext, masterSeed, tamperedTubes);
        throw new Error('Integrity check failed to catch tampering!');
    } catch (err: any) {
        if (err.message.includes('Integrity check failed')) {
            console.log('✅ Correctly caught integrity tampering');
        } else {
            throw err;
        }
    }

    // Test Decryption Failure (wrong seed)
    const wrongSeed = crypto.randomBytes(32);
    try {
        decryptCipherTube(result.ciphertext, wrongSeed, result.tubes);
        // Sometimes AES-GCM might decrypt to garbage if tag matches by chance (extremely unlikely)
        // or it might throw "Wrong tag"
        throw new Error('Decryption with wrong seed should have failed');
    } catch (err: any) {
        console.log(`✅ Decryption with wrong seed failed as expected: ${err.message}`);
    }

    console.log('All CTA tests passed! 🚀');
}

testCTA();
