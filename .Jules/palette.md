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

## 2026-09-05 - [Accessible Mythic Visualizations]
**Learning:** Complex visual elements like the "Cosmology Map" nodes are often invisible to screen readers and inaccessible via keyboard. Providing `tabindex="0"`, `role="img"`, and a descriptive `aria-label` that combines the name and mandate ensures these "mythic" elements are perceivable and navigable for all users.
**Action:** For all non-textual interactive or informative visual nodes, explicitly define ARIA roles and labels, and mirror `:hover` interactions with `:focus-visible` styles.

## 2026-07-03 - [Contextual Info for Visual Nodes]
**Learning:** Purely visual representations of system state (like the Cosmology Map) can be cryptic without contextual labels. Providing a dedicated, live-updated text area that mirrors ARIA labels upon interaction significantly improves both discoverability for sighted users and accessibility for those using assistive technology.
**Action:** When implementing complex visualizations, include a persistent "detail" area that populates on hover/focus to provide immediate textual context for visual icons or nodes.
