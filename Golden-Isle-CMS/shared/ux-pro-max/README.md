# UI UX Pro Max - Fintech Dark AgentKit

Inspired by **Creative INK Academy**, this directory houses the manual implementation of the **Pro Max** design standards for the Golden Isle Wholesale CMS.

## Design Philosophy (Fintech Dark)
The "Pro Max" standard for fintech applications prioritizes **Trust, Precision, and Accessibility**.

### Core Standards:
- **No Pure Black:** Background uses Deep Navy (`#0B0E14`) to prevent OLED smearing and eye strain.
- **Layered Elevation:** Depth is created through surface color shifts (`#171C26` to `#1E293B`) rather than excessive shadows.
- **Data Precision:** Typography uses high-legibility fonts (Inter/JetBrains Mono) with optimized line heights for numerical data.
- **Intentional Accents:** Trust Blue (`#3B82F6`) for primary actions and Success Green (`#10B981`) for growth indicators.

## Structure
- `/theme`: CSS-based Tailwind v4 configuration tokens.
  - `colors.css`: Semantic color tokens.
  - `typography.css`: Premium font scales and weights.
  - `spacing.css`: Radii, spacing grid, and shadows.
  - `index.css`: The master theme entry point.

## Usage
Import the master theme in your root `globals.css`:
```css
@import "../../shared/ux-pro-max/theme/index.css";
```

Apply the `pro-max-dark` class to your container to activate the theme.

---
*Created manually to bypass UI-PRO CLI SSH permission issues.*
