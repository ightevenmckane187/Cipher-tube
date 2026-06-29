## 2026-05-24 - [Duplicate ID & Missing Feedback]
**Learning:** Duplicate HTML IDs (e.g., #theme-toggle) create accessibility violations and functional ambiguity for screen readers and scripts. Asynchronous actions (e.g., session extension) without loading states lead to user uncertainty and potential double-clicks.
**Action:** Always ensure unique IDs for interactive elements and provide immediate visual feedback (disabling button, loading text) for all asynchronous operations.

## 2026-06-15 - [Keyboard Shortcut Hijacking & Discoverability]
**Learning:** Implementing global keyboard shortcuts (like '/') without checking if an input is already focused can hijack expected browser behavior or prevent users from typing that character into fields. Additionally, visual shortcut hints should be paired with `aria-keyshortcuts` to ensure discoverability for screen reader users.
**Action:** Always check `document.activeElement` before executing global shortcuts and use `aria-keyshortcuts` on relevant elements to expose shortcuts to assistive technologies.

## 2026-07-10 - [Label Overwriting & Icon Preservation]
**Learning:** Updating a button's `textContent` or `innerHTML` directly with status messages (e.g., "Creating...") often unintentionally overwrites icons or decorative elements (like emojis). This breaks visual consistency and can remove accessible labels if not handled carefully.
**Action:** Use a dedicated sub-element (e.g., `<span class="btn-text">`) for the text portion of a button and target it specifically when updating state, preserving sibling icons.

## 2026-08-12 - [Accessible Async Feedback with aria-busy]
**Learning:** Visual-only loading states (like changing button text) are insufficient for screen reader users to understand that an asynchronous operation is in progress. Using `aria-busy` alongside `disabled` provides a semantic signal to assistive technologies about the element's changing state.
**Action:** Always pair visual loading indicators with `aria-busy="true"` on the initiating interactive element, and ensure it resets to `false` upon completion or failure.

## 2026-09-15 - [Mythic Mirror Spatial Layout & Interactive Consistency]
**Learning:** Dense horizontal layouts for archetype nodes (e.g., the Cosmology Map) require specific container height (220px) and 'flex-direction: row' to prevent overlapping and ensure visual clarity during hover/focus scaling. Mirroring :hover states with :focus-visible using a consistent outline-offset (4px) ensures that keyboard users receive the same high-quality feedback as mouse users without visual jitter.
**Action:** Always use container-constrained flex layouts for the Mythic Mirror and pair scaling transforms with offset outlines for inclusive interactive feedback.
