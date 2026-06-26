# Security Guide

## Encryption Standards

As of v1.5.0, Cipher Tube utilizes **AES-256-GCM** (Advanced Encryption Standard with Galois/Counter Mode) for its cryptographic operations.

### Why AES-256-GCM?
- **Strength**: 256-bit keys provide a massive security margin against brute-force attacks.
- **Integrity**: GCM provides both confidentiality and authenticity, ensuring that encrypted data has not been tampered with.
- **Performance**: Hardware acceleration (AES-NI) ensures minimal latency.

## Reporting a Vulnerability

Security is our top priority. If you discover a security vulnerability, please follow these steps:

1. **Do not disclose publicly**: Avoid posting details on GitHub Issues or social media.
2. **Email the maintainer**: Send a detailed report to the security team (see LICENSE or README for contact details).
3. **Include details**: Provide a summary, steps to reproduce, and potential impact.

We aim to acknowledge all reports within 48 hours and provide a fix or mitigation plan within 1 week.
