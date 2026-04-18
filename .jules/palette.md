## 2025-05-15 - [Accessible Minimal Landing Page Pattern]
**Learning:** For a security-focused API, a minimal, dark-mode-responsive landing page provides a pleasant "first-contact" experience for developers and users without significantly increasing the attack surface or maintenance burden.
**Action:** Always include a basic, accessible `/` route when building API-first services to avoid the "404 confusion" and provide immediate system status visibility. Use `prefers-color-scheme` for zero-JS dark mode support.
