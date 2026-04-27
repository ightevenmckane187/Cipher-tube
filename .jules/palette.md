## 2025-05-15 - [Enhancing Landing Page Accessibility and Polish]
**Learning:** Minimalist landing pages often neglect keyboard accessibility and screen reader support. Adding a skip-link and semantic HTML significantly improves the experience for assistive technology users without cluttering the visual design.
**Action:** Always include a skip-link and semantic containers (`main`, `footer`) even for single-purpose landing pages. Use `aria-live="polite"` for status indicators to ensure screen reader users are notified of the system state.

## 2026-04-26 - [FOUC Prevention in Server-Side Rendered Dark Mode]
**Learning:** When serving HTML strings directly from a server, using `prefers-color-scheme` in CSS alone can't handle persisted user preferences without a flash of unstyled content (FOUC). An inline IIFE in the `<head>` that checks `localStorage` is essential to apply the correct theme before the body is painted.
**Action:** Always use an inline script in the `<head>` to set the `data-theme` attribute based on `localStorage` or `matchMedia` to ensure a smooth, flicker-free theme application.
