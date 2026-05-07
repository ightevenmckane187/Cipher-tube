## 2026-05-07 - [Keyboard Discoverability and Code Block Accessibility]
**Learning:** Providing visual hints for keyboard shortcuts using the `<kbd>` tag significantly improves discoverability for power users. Furthermore, code blocks that are horizontally scrollable must be keyboard-focusable (via `tabindex="0"`) and appropriately labeled (via `role="region"` and `aria-label`) to ensure they are accessible to keyboard and screen reader users.
**Action:** Always add keyboard hints for custom shortcuts and ensure overflow-scroll containers are focusable with descriptive ARIA attributes.
