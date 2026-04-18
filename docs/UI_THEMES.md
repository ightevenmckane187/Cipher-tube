# UI Themes & Dark Mode

Cipher Tube v1.5.0 introduces a comprehensive Dark Mode UI to enhance readability and reduce eye strain.

## Features

- **Automatic Detection**: The UI respects your system's preference (`prefers-color-scheme`).
- **Manual Toggle**: Users can manually switch between Light and Dark themes via the settings menu.
- **High Contrast**: Optimized for accessibility (WCAG 2.1 AA compliant).

## Implementation

Dark mode is implemented using CSS Custom Properties (Variables), ensuring zero performance overhead.

```css
:root {
  --bg-color: #ffffff;
  --text-color: #000000;
}

[data-theme='dark'] {
  --bg-color: #121212;
  --text-color: #e0e0e0;
}
```
