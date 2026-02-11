

## Remove Pipeline + Add Mouse-Following Glow Background

### What changes
1. **Remove the static pipeline SVG** -- Delete the `StaticPipeline` component and its container div, plus the faint horizontal rule accent line from `HeroBackground`.

2. **Add an interactive mouse-tracking radial glow** -- Inspired by the nitroacc.xyz site, which has a soft ambient light that follows the cursor. The implementation will:
   - Track mouse position via `onMouseMove` on the hero section
   - Render a large, soft radial gradient circle (using the primary orange accent at very low opacity) that smoothly follows the cursor with CSS `transition` for a laggy/smooth feel
   - Keep the existing dot grid and base background intact
   - Keep the bottom fade gradient

3. **No UX changes** -- All buttons, CTAs, modal auth flow, nav bar remain untouched.

### Technical Details

**File: `src/components/Hero.tsx`**

- Add `useState` for mouse `x, y` coordinates
- Add `onMouseMove` handler on the outer `<section>` element to capture cursor position
- In `HeroBackground`, accept mouse coordinates as props and render a `div` with a `radial-gradient` centered at the mouse position, using `transition: background 0.3s ease` for the smooth trailing effect
- Remove `StaticPipeline` function entirely (~40 lines)
- Remove the horizontal rule div and the `ACCENT` constant
- Keep: base background, toned-down vignette, dot grid, bottom fade

The glow will be a subtle warm orange radial gradient (matching the brand accent `hsl(38 92% 50%)`) at around 4-6% opacity, roughly 600px radius, creating a soft spotlight effect that follows the mouse without being distracting.

