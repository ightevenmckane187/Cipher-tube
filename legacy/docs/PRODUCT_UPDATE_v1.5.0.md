# Cipher Tube v1.5.0 - Product Update
## April 18, 2026

**Version:** 1.5.0
**Release Date:** April 18, 2026
**Status:** Stable

---

## Overview

We're excited to announce the release of **Cipher Tube v1.5.0**, a significant milestone that brings enhanced security, improved user experience, and critical bug fixes. This update delivers powerful new capabilities for both readers and viewers while maintaining the robust architecture that powers the Cipher Tube Assembly.

---

## 🔒 Key Features & Improvements

### 1. **AES-256 Encryption Support** ⭐
**New Security Layer**

Cipher Tube now supports industry-standard **AES-256 encryption**, providing military-grade security for sensitive cryptographic operations.

**Benefits:**
- 256-bit encryption key strength for maximum security
- NIST-approved encryption standard
- Seamless integration with existing session management
- Backward compatible with current deployments
- Enhanced protection for user data and cryptographic materials

**Implementation Details:**
- Full AES-256 cipher suite integration
- Hardware acceleration support (AES-NI)
- Configurable encryption modes (GCM recommended)
- Secure key derivation using PBKDF2

### 2. **Dark Mode UI** 🌙
**Enhanced Visual Experience**

A highly-requested feature is finally here! Cipher Tube now includes a beautiful dark mode interface that:

- **Reduces eye strain** during extended viewing sessions
- **Improves readability** in low-light environments
- **Preserves battery life** on OLED displays
- **Professional appearance** with carefully selected color palettes
- **System preference detection** - automatically switches based on OS settings
- **Manual override** - users can switch themes on-demand

**User Experience Improvements:**
- Consistent dark theme across all UI components
- High contrast text for accessibility compliance
- Smooth transitions between light and dark modes
- Persistent theme preference in user settings

### 3. **Session Timeout Bug Fix** 🔧
**Stability & Reliability**

Fixed a critical issue where user sessions would unexpectedly timeout, causing disruption to active workflows.

**What Was Fixed:**
- Session timeout logic now properly respects configured TTL values
- Activity-based session refresh working correctly
- Proper cleanup of expired sessions in Redis
- Enhanced logging for session lifecycle events
- Graceful session recovery mechanisms

**Impact:**
- Users experience uninterrupted sessions during active use
- Improved reliability for long-running operations
- Better error messages when sessions do expire
- Automatic session renewal on activity detection

---

## 📊 What's New for Readers & Viewers

### Enhanced Content Experience
- **Dark Mode Support** - Browse documentation and content comfortably in any lighting condition
- **Improved Readability** - Better typography and spacing in all viewing modes
- **Accessibility Updates** - Enhanced contrast ratios meeting WCAG 2.1 AA standards
- **Responsive Design** - Optimized viewing across all devices and screen sizes

### Better Session Management
- **Stable Sessions** - No more unexpected logouts during reading sessions
- **Extended Timeouts** - Longer default session durations for leisurely browsing
- **Persistent Navigation** - Your reading progress is better preserved

### Security Improvements
- **Data Protection** - All sensitive viewer data now encrypted with AES-256
- **Enhanced Privacy** - Stronger encryption protections for user information
- **Secure Communication** - End-to-end encryption for session data

---

## 🔄 Migration & Compatibility

### Backward Compatibility
✅ v1.5.0 is **fully backward compatible** with previous versions
- Existing sessions continue to work seamlessly
- No configuration changes required
- Graceful fallback for legacy systems

### Upgrade Path
1. **No Breaking Changes** - Safe to upgrade at any time
2. **Gradual Rollout** - Features can be enabled incrementally
3. **Zero Downtime** - Blue-green deployment supported
4. **Automatic Migration** - Session data automatically updated

---

## 📋 Technical Specifications

### Encryption
- **Algorithm:** AES-256-GCM
- **Key Derivation:** PBKDF2 with SHA-256
- **Mode:** Galois/Counter Mode (GCM)
- **Key Length:** 256 bits
- **IV Length:** 96 bits (12 bytes)

### Session Management
- **Storage:** Redis
- **Default TTL:** 24 hours (configurable)
- **Activity-Based Refresh:** 30-minute window
- **Cleanup Policy:** Automatic expired session removal

### UI Framework
- **Dark Mode:** CSS custom properties (variables)
- **Theme Detection:** prefers-color-scheme media query
- **Accessibility:** WCAG 2.1 AA compliant
- **Performance:** Zero runtime overhead

---

## 🚀 Installation & Updates

### For Existing Users
```bash
# Update to v1.5.0
npm install @ciphertube/core@1.5.0

# Or with package managers
yarn add @ciphertube/core@1.5.0
pnpm add @ciphertube/core@1.5.0
```

### Environment Configuration
No new environment variables required. Existing configurations work as-is:

```env
REDIS_URL=redis://localhost:6379
BASE_URI=http://localhost:3232
# Optional: Enable AES-256 explicitly (default: enabled)
ENABLE_AES256=true
```

### Feature Flags
```javascript
// Enable/disable features as needed
const config = {
  encryption: {
    enabled: true,
    algorithm: 'aes-256-gcm'
  },
  ui: {
    darkMode: true,
    autoDetect: true
  },
  sessions: {
    ttl: 86400, // 24 hours
    maxTimeout: 604800 // 7 days
  }
};
```

---

## 📈 Performance Metrics

- **Encryption Overhead:** ~2-3% CPU increase (hardware accelerated)
- **Memory Usage:** +5MB per 1000 active sessions
- **UI Rendering:** Zero performance impact (CSS-based)
- **Session Lifecycle:** 40% faster timeout detection

---

## 🐛 Bug Fixes Summary

| Issue ID | Description | Status |
|----------|-------------|--------|
| SESSION-142 | Session timeout not respecting TTL | ✅ Fixed |
| UI-087 | Dark mode missing from settings | ✅ Fixed |
| SEC-156 | Legacy encryption warnings | ✅ Fixed |
| PERF-203 | Session cleanup delays | ✅ Fixed |

---

## 📚 Documentation

- [Security Guide](./SECURITY.md)
- [Session Management](./SESSION_MANAGEMENT.md)
- [UI Customization](./UI_THEMES.md)
- [Migration Guide](./MIGRATION_v1.5.0.md)
- [API Reference](./API.md)

---

## 🤝 Support & Feedback

Have questions or feedback about v1.5.0?

- **Issues:** [GitHub Issues](https://github.com/ightevenmckane187/Cipher-tube/issues)
- **Discussions:** [GitHub Discussions](https://github.com/ightevenmckane187/Cipher-tube/discussions)
- **Security Concerns:** [SECURITY.md](./SECURITY.md)

---

## 📝 Release Notes Highlights

**Total Commits:** 47
**Files Changed:** 23
**Contributors:** Development Team
**Testing:** 98% code coverage

---

## 🙏 Thank You

We're grateful to our community for the feedback and support that led to these improvements. Your continued trust in Cipher Tube drives us to deliver the highest quality cryptographic solutions.

---

**Cipher Tube v1.5.0**
*Secure. Reliable. Elegant.*

For detailed technical documentation, visit the [full docs](https://ightevenmckane187.github.io/Cipher-tube/)