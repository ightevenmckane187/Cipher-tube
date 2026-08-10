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

## 2026-07-04 - [Dynamic Info Regions for Mythic Discovery]
**Learning:** Static tooltips or ARIA labels on complex visual elements (like Archetype nodes) provide accessibility but lack "discoverability" for sighted users. Adding a dedicated, dynamic info region that updates on hover/focus provides a persistent place for users to learn about the system's "mandates" without needing to wait for browser tooltips.
**Action:** Pair complex visual nodes with a persistent status or info region (`aria-live="polite"`) that exposes deeper metadata upon interaction.

## 2026-08-04 - [Visible Hover and Focus States Across Themes]
**Learning:** Overriding browser default focus styles with `outline: none;` and replacing them with a visual-only indicator (like a white box-shadow) can create severe accessibility violations on light themes, where white shadows are completely invisible. Active indicators should use theme-adaptive variables (e.g., `var(--primary)`) and distinct outline definitions to guarantee they remain clearly perceivable on all background color schemes.
**Action:** Ensure custom focus indicators utilize theme-appropriate CSS custom properties for shadows and borders, and never suppress native outlines without substituting a robust, high-contrast, theme-compliant fallback.

## 2026-08-10 - [Dynamic ARIA Shortcut Synchronization & Primary Button Focus Contrast]
**Learning:** Pairing client-side keyboard shortcut overrides with static `aria-keyshortcuts` creates accessibility mismatches when shortcuts are disabled. Dynamically removing/restoring the `aria-keyshortcuts` attributes ensures that screen readers only announce active shortcuts. Additionally, default focus rings on primary-colored buttons (e.g. blue) of the same primary color results in zero contrast, which can be mitigated by custom high-contrast focus rings.
**Action:** Always dynamically synchronize ARIA attributes alongside behavior states (like toggles) and design high-contrast outlines for interactive components with strong background color themes.
