

## Redesign `/auth` as a Hero Landing Page (Emergent-style)

Transform the current minimal auth form into a visually striking split-screen landing page inspired by [app.emergent.sh/landing](https://app.emergent.sh/landing/).

### Layout Structure

```text
+-------------------------------+-------------------------------+
|          LEFT HALF            |          RIGHT HALF           |
|                               |                               |
|  Floating code characters     |   Gradient background         |
|  background (subtle, muted)   |   (orange/amber -> dark)      |
|                               |                               |
|       [Started Logo]          |   "Ship Code Faster"          |
|                               |   headline + subtext          |
|   "Build & Ship Software"     |                               |
|   "with AI — in minutes"      |   [Browser mockup frame       |
|     (orange accent)           |    showing IDE screenshot      |
|                               |    or placeholder visual]     |
|   [=== Continue with Email]   |                               |
|        --- OR ---             |   Carousel dots (optional)    |
|   [email + password form]     |                               |
|                               |                               |
|   Terms / Privacy links       |                               |
+-------------------------------+-------------------------------+
```

On mobile (< `lg`), stack vertically: hero section on top, auth form below.

### Design Decisions

- **Left panel**: Dark background with subtle floating code/terminal characters (CSS-only, no images needed). Logo centered above headline. Auth form below.
- **Right panel**: Orange-to-dark gradient with a headline badge and a browser-frame mockup containing a placeholder IDE screenshot. This mirrors Emergent's showcase section.
- **Branding**: Use the Started logo, orange accent (`hsl(38, 92%, 50%)`), and existing design tokens.
- **Auth logic**: All existing auth logic (sign in, sign up, email verification success state) stays intact -- only the visual wrapper changes.
- **No new dependencies**: Pure Tailwind CSS for all visual effects (gradients, floating characters, browser mockup frame).

### Floating Characters Background

CSS-only decorative layer on the left panel using absolutely-positioned, low-opacity monospace characters (code symbols like `{ } => () [] //`), similar to Emergent's letter background. Implemented as a static array of positioned spans with `text-muted-foreground/10` opacity.

### Right Panel Showcase

- Gradient background using the orange accent color fading to dark
- A "badge" line (e.g., "AI-Powered IDE") at the top
- Headline: "Ship Code Faster" with a subline
- A browser-frame mockup (CSS border-radius + dot indicators) containing either:
  - The existing `placeholder.svg`
  - Or a styled div showing a mini IDE preview

### Files Changed

| File | Action |
|------|--------|
| `src/pages/Auth.tsx` | Full rewrite of the JSX layout (auth logic unchanged) |

### What Stays the Same

- All auth state management, form handling, sign-up success flow
- Logo image import
- Redirect logic for authenticated users
- Loading spinner
