

# Improve Landing Page UX, Screenshot Visibility, and Mobile Experience

## Current Issues
- The IDE screenshot overflows with negative margins, causing horizontal scroll risk on smaller screens
- On mobile, the screenshot is tiny and hard to appreciate -- it just looks like a blurry strip
- No perspective/3D effect to make the screenshot feel premium and elevated
- The hero section has excessive whitespace on mobile before the screenshot
- The nav bar doesn't feel native/app-like on mobile (too much padding, "Sign In" wraps)
- The CTA button and text spacing aren't optimized per breakpoint
- No smooth scroll or snap behavior for mobile to give that "app-like" feel

## Changes

### 1. Hero Component (`src/components/Hero.tsx`) -- Major Rewrite

**Screenshot presentation upgrade:**
- Replace the raw overflow approach with a CSS perspective/3D tilt effect that makes the IDE screenshot look like it's floating above the page
- Add a subtle orange gradient glow beneath the screenshot for depth
- Use responsive sizing: full-width on mobile (no negative margins), slightly overflowed on desktop for impact
- Add a soft shadow and brighter orange border glow on hover

**Mobile-first text sizing:**
- Headline: `text-4xl` on mobile, `text-5xl` on sm, `text-6xl` on md, `text-7xl` on lg
- Reduce vertical spacing on mobile (`py-12` instead of `py-20`, `mt-12` instead of `mt-20`)
- Center-align text and CTA on mobile, left-align on sm+

**CTA button:**
- Full-width on mobile with larger touch target (`h-12`)
- Auto-width on sm+ screens
- Add a subtle scale transition on press for mobile tactile feel

**Screenshot container:**
- On mobile: no negative margins, rounded corners, contained within padding
- On tablet: slight overflow with perspective tilt
- On desktop: larger overflow with stronger perspective effect
- Add a fade-to-background gradient at the bottom edge so it blends into the page

### 2. Auth Page (`src/pages/Auth.tsx`) -- Mobile Navigation Polish

**Nav bar mobile optimization:**
- Reduce padding on mobile (`px-4 py-3` instead of `px-6 py-4`)
- Smaller logo on mobile (`h-7` instead of `h-10`)
- Ensure "Sign In" doesn't wrap -- use compact spacing
- Add `mt-2` on mobile instead of `mt-3`

**Auth modal on mobile:**
- Make the modal slide up from the bottom on mobile (like a native bottom sheet) using framer-motion
- Full-width with rounded top corners only
- On desktop, keep the centered modal behavior

### 3. Global Mobile Polish (`src/index.css`)

- Add `-webkit-tap-highlight-color: transparent` and `touch-action: manipulation` for native feel
- Ensure `overscroll-behavior: none` to prevent pull-to-refresh bounce
- Add smooth scroll behavior

## Technical Details

### Files Modified
1. **`src/components/Hero.tsx`** -- Responsive redesign with perspective screenshot, mobile-first sizing, centered mobile layout
2. **`src/pages/Auth.tsx`** -- Mobile nav polish, bottom-sheet auth modal on mobile using framer-motion
3. **`src/index.css`** -- Mobile touch optimizations (tap highlight, overscroll, smooth scroll)

### Key Implementation Patterns
- Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) consistently for all breakpoints
- Use framer-motion `AnimatePresence` for the auth modal with different animations per viewport
- Use CSS `perspective` and `rotateX` for the 3D screenshot tilt effect
- Use the existing `useIsMobile` hook to toggle between bottom-sheet and centered modal behavior

