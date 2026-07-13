## 2026-07-03 - Static CSS and UI Fragment Pre-rendering
**Learning:** Inlining large blocks of static CSS (300+ lines) and complex HTML fragments inside Express request handlers creates unnecessary CPU and memory pressure on every request. Pre-rendering these at the module scope as constants significantly reduces the overhead of template literal interpolation and intermediate string allocations.
**Action:** Always move static CSS and data-driven HTML fragments that don't change between requests into module-level constants to optimize hot paths like landing pages.
