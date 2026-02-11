

## Plan: Navbar Glass Cleanup, Remove Tag, and Stylized "o" Characters

### 1. Optimize the Glass Navbar
The current navbar uses `backdrop-blur-xl` and a `before:` pseudo-element gradient overlay which can cause rendering artifacts (patching/quality issues) on some browsers. The fix:
- Replace `backdrop-blur-xl` with `backdrop-blur-md` (lighter blur, fewer artifacts)
- Remove the `before:` pseudo-element gradient entirely (the main source of layering/patching issues)
- Keep the subtle border, shadow, and semi-transparent background for the glass feel
- Result: cleaner glass effect with better rendering performance

### 2. Remove "Deterministic build runtime" Tag
Delete the second `<span>` inside the micro-labels section of `Hero.tsx` that displays "Deterministic build runtime".

### 3. Stylized "o" with Slash (ø) in Hero Headline
Replace all lowercase "o" characters in the hero headline text with the Unicode character "ø" (o-with-slash), rendered in a monospace font to give a code/terminal aesthetic. This will be done by modifying the `renderTitleWithAccent` function to post-process each text span, wrapping every "o" in a `<span className="font-mono">ø</span>`. The "AI agents" accent span will also receive this treatment.

### Technical Details

**File: `src/pages/Auth.tsx`** (line 49)
- Simplify the `<nav>` className: remove `before:*` classes, change `backdrop-blur-xl` to `backdrop-blur-md`

**File: `src/components/Hero.tsx`**
- Lines 38-41: Remove the "Deterministic build runtime" span entirely
- Lines 78-100: Update `renderTitleWithAccent` to replace "o" characters with a monospace-styled "ø" character in all rendered text spans

