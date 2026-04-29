## 2025-05-15 - [Enhancing Landing Page Accessibility and Polish]
**Learning:** Minimalist landing pages often neglect keyboard accessibility and screen reader support. Adding a skip-link and semantic HTML significantly improves the experience for assistive technology users without cluttering the visual design.
**Action:** Always include a skip-link and semantic containers (`main`, `footer`) even for single-purpose landing pages. Use `aria-live="polite"` for status indicators to ensure screen reader users are notified of the system state.

## 2026-04-26 - [FOUC Prevention in Server-Side Rendered Dark Mode]
**Learning:** When serving HTML strings directly from a server, using `prefers-color-scheme` in CSS alone can't handle persisted user preferences without a flash of unstyled content (FOUC). An inline IIFE in the `<head>` that checks `localStorage` is essential to apply the correct theme before the body is painted.
**Action:** Always use an inline script in the `<head>` to set the `data-theme` attribute based on `localStorage` or `matchMedia` to ensure a smooth, flicker-free theme application.

## 2026-04-27 - [Accessible Success Colors and CSP Nonce Implementation]
**Learning:** Default "success" colors like #4cd137 often fail WCAG AA contrast requirements on white backgrounds. Switching to a darker green like #1e7e34 improves accessibility for all users. Additionally, when using security headers like Helmet's CSP, inline scripts must be protected with nonces to balance security with functional UX features like theme toggles.
**Action:** Always verify color contrast for status indicators and use nonces for any necessary inline scripts to ensure they aren't blocked by strict CSP policies.

## 2026-04-29 - [Improving Developer UX with Interactive Code Blocks]
**Learning:** For API-centric services, a plain text "Quick Start" is often insufficient. Providing a pre-formatted `curl` command in a terminal-style code block with a dedicated copy button significantly lowers the barrier to entry. Using visual feedback like temporary button text changes ("Copy" -> "Copied!") provides immediate reassurance of success.
**Action:** Always include interactive examples for core API flows on landing pages. Ensure "Copy" buttons have explicit `aria-label` attributes and provide clear visual/textual state transitions upon interaction.
