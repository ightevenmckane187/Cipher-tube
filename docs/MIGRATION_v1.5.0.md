# Migration Guide: Upgrading to v1.5.0

Upgrading to Cipher Tube v1.5.0 is a straightforward process with no breaking changes for most users.

## Steps to Upgrade

1. **Update Dependencies**:
   ```bash
   npm install @ciphertube/core@1.5.0
   ```

2. **Update Environment Variables**:
   While not strictly required, you can now explicitly enable AES-256-GCM:
   ```env
   ENABLE_AES256=true
   ```

3. **Restart Service**:
   Restart your Express server to apply the session management fixes and new security headers.

## Compatibility

- **Node.js**: Requires v18.0.0 or higher.
- **Redis**: Compatible with Redis v4.x and above.
- **Existing Sessions**: v1.5.0 is backward compatible; existing sessions in Redis will continue to function.
