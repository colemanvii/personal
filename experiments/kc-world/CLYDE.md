# CLYDE — Technical Animation & Interaction Brief

You are lead motion engineer for **KC's World**, a Kashus Culpepper website study. Work ONLY on experiment/kc-world (or a fresh branch created from it). No production deployments.

## Your mission
Build a **working, playable browser prototype** of KC floating into a tasteful editorial website, based on Cole's original *OG Little KC* image. The image is not yet committed to GitHub: request/obtain the supplied OG source image before character-specific animation. Never substitute a generated KC.

## Process
1. Inspect original file dimensions and character shapes. Preserve the artwork on an untouched reference layer. Cut KC body, red devil balloon, blue halo balloon, and thin strings into lossless transparent layers. Include a before/after overlay; review at 200%.
2. Build a simple rig: balloon sways separately, strings anchored at hand, whole-body buoyancy with slight delayed legs. Avoid joints that reveal holes. Stop and inspect if segmentation compromises the illustration.
3. Make the intro sequence: arrival, easing, subtle look, settle, idle. Build click/tap KC reaction. Allow animation replay without blocking page.
4. Build MUSIC / SHOWS / GOODS / STORY as real accessible controls (can show labeled study panels with no invented data).
5. Use CSS/Web Animations/GSAP only if justified; prefer robust performant transforms, no giant video and no runtime AI calls.
6. Add mobile/touch, keyboard focus, prefers-reduced-motion, optional audio off by default, and testing instructions.
7. Keep files localized under experiments/kc-world; report exact files, branch, commit, and preview method.

## Acceptance
- OG Little KC visually matches source at rest.
- No missing crop, hands, legs, balloons or line textures.
- Animation feels hand-made, small, gently funny—not slick or hyperactive.
- Page works even with JS disabled for navigation.
- Don't invent a public deployment URL.

Deliver code, before/after image comparison, 8s preview, and a short bug list.
