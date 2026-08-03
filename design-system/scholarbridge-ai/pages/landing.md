# Landing page overrides — ScholarBridge AI

> Overrides `../MASTER.md` for the public marketing homepage only.
> Dashboard / app UI keeps existing `globals.css` tokens (`--acc` cyan).

## Visual direction

- **Pattern:** Parallax storytelling + feature-rich showcase (3D scroll hero)
- **Style:** Motion-driven + dimensional layering (not flat cards in hero)
- **Mode:** Dark cinematic for hero/scroll sections; app tokens elsewhere
- **Brand:** "ScholarBridge AI" must be hero-level (not nav-only)
- **Accent:** Keep product cyan `#22d3ee` / `#38bdf8` (existing brand) — do not switch to MASTER gold CTA on this page
- **Typography:** Crimson Pro (display) + Atkinson Hyperlegible (body) from MASTER
- **Imagery:** Local GLBs in `/public/models/` (globe, laptop, email, paper, calendar)
- **Motion:** GSAP ScrollTrigger + Three.js bloom; respect `prefers-reduced-motion`

## Sections (order)

1. Sticky nav
2. Horizon 3D scroll hero (`horizon-hero-section`) — DISCOVER → PERSONALIZE → OUTREACH
3. Feature bento (21st-adapted)
4. Radial feature gallery
5. Container scroll product preview (21st-adapted)
6. How it works (3 steps)
7. ScrollModel3D (local GLBs)
8. Final CTA + footer

## Anti-patterns for this page

- No purple/pink nebula or AI-slop gradients
- No inset hero media cards — globe is full-bleed WebGL
- No stats strip inside first viewport
- No emoji icons
