# Final mobile refinement pass — 2026-10-14

## Typography finding and smallest fix

The homepage hard-coded Monaco, "Courier New", monospace, whereas interior pages used a separate stack. Apple's current system-font inventory labels Monaco "system font macOS" but "downloadable iOS"; Menlo Regular and Courier New are system fonts on iOS. Therefore an ordinary iPhone without downloaded Monaco falls through to Courier New on the homepage. This is the supported explanation for the reported lighter appearance, not a measured diagnosis on the user's physical phone.

Mobile now uses Monaco, Menlo, "SFMono-Regular", Consolas, "Liberation Mono", monospace. Monaco stays first; Menlo Regular replaces the typewriter-style Courier fallback. Homepage and index share the stack. No weight, size, tracking, color or smoothing changes were made. No font files or font-loading dependencies were added. Desktop CSS remains unaffected.

A browser test deliberately removed Monaco from the CSS, then queried the actual platform font via Chrome DevTools: Menlo-Regular rendered the homepage and index at every tested phone size. Normal tests rendered Monaco. Separate 3× screenshots compare Courier New, Menlo and Monaco at the same 16px / 400 weight. These are controlled macOS browser renders, not physical iOS screenshots.

The existing -webkit-font-smoothing: antialiased rule is nonstandard and not a reliable cross-platform weight control; changing it would not solve a different font family. It remains unchanged to preserve desktop appearance. Physical Safari rasterization should be judged on the public preview.

Sources: https://developer.apple.com/fonts/system-fonts/ and https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-smooth

## Invisible targets, unchanged composition

Index actions now have an invisible pseudo-element covering exactly their existing row, including the number and year areas. Single-line effective targets are 339 × 33px, 354 × 33px and 394 × 37px at the requested widths. Wrapped rows have taller targets. The element boxes remain 32/36px; the extra pixel is the collapsed row-border space. Target bounds meet at row boundaries with no geometric overlap. Browser hit tests sampled one pixel inside both vertical edges at both horizontal edges of all 18 rows: all 72 points passed for each viewport, with both native Monaco and forced Menlo. Non-interactive rows stayed non-interactive. Subpixel queries within one pixel of a boundary are subject to browser hit-test rounding.

The homepage links also receive invisible 9px padding above and below: 37.2px high targets inside the existing 39.2px pitch, leaving 2px between links. No text position or visual dimensions change. Further uniform height expansion beyond the index row pitch would overlap adjacent rows; 44px is not possible without changing density. The substantial gain here is full-row width, including short labels such as PBR.

## Final measurements

| Viewport | Index region / content height | Minimum effective index target | Page overflow | Result |
|---|---|---|---|---|
| 375 × 812 | 665 / 665 px | 339 × 33 px | None | All 18 complete names, no scrolling |
| 390 × 844 | 697 / 697 px | 354 × 33 px | None | All 18 complete names, no scrolling |
| 430 × 932 | 785 / 785 px | 394 × 37 px | None | All 18 complete names, no scrolling |
| 320 × 568 | 436 / 697 px | 284 × 33 px | None | Content region scrolls 261 px |

Same results with Monaco and with Monaco unavailable / Menlo selected. Title text bounds stay within their cells. All 17 images across eleven panels decode and use contain fitting at every tested width. All requested portrait sizes fit without index scrolling. Short-screen scrolling remains deliberate, preserving 13px text. Hotel Perle, The Bygone and Scout Motors remain non-interactive.

Touch gallery next/previous, image close and restored focus, project close and restored focus, keyboard Enter/Escape, inert covered index, last-row reachability, navigation and palette persistence all pass. Landscape 812 × 375 remains covered by the interaction checks. No JavaScript exceptions or HTTP asset failures were recorded in the final local checks.

## Desktop regression

All 22 final 1440 × 900 screenshots are pixel-identical to the original 8c0e99b baseline: homepage, index, all eleven panels, and nine enlarged viewers. Zero changed pixels in every pair.

## Review boundary

Push only study/mobile-refinement. Cloudflare Pages project personal has production branch portfolio-v2 and automatic previews enabled for all other branches; this branch is a preview, not a production release. No merge or custom-domain deployment is authorized. Stop after the preview is ready for review.

Physical iPhone Safari / VoiceOver validation is still outstanding. The public preview is intended for that review; the font-fallback evidence and automated browser tests do not substitute for a physical-device test.

---

# Mobile refinement audit

Date: 2026-10-14. Baseline: origin/main at 8c0e99b. Branch: study/mobile-refinement.
Public Work Index HTML matched the fetched baseline byte-for-byte. Tested in installed Chromium 153 via Playwright, on macOS, at device scale 1 with touch enabled for mobile. This is browser emulation, not physical iPhone/Safari testing.

## Confirmed versus unverified

- Confirmed: most index actions were only 14.4–15 px tall. Standard rows were 30.3–32 px tall, but their padding was not clickable. CLOSE was normally 46.2 × 16.5 px.
- Confirmed: hiding Role cells left their column consuming 50 px. At 375/390 px, Freeman wrapped and the Dylan Gossett external-link arrow occupied its own line. Titles were complete, not clipped.
- Confirmed: fixed-ratio cover previews cropped Cowboyer, ERNEST, Habitat, PBR, Ronnie and Teton imagery. ERNEST's 4:5 image was shown in a roughly 4:3 frame, exposing about 60% of its vertical content. The full-screen viewer already preserved aspect ratio.
- Confirmed: Escape inside the image viewer closed both viewer and project, leaving focus on hidden artwork. Viewer gallery navigation was keyboard-only.
- Not reproduced: page overflow, missing local assets, JavaScript exceptions, overlapping rows, clipped titles or double-tap opening at the four requested sizes. All eleven project actions opened on one tap. Existing CLOSE returned focus when used directly.
- Single-screen legibility was achievable at all requested portrait sizes. A blanket claim that eighteen entries cannot fit is unsupported.

## Changes and reasons

1. Mobile only: remove the unused column; put entry count beside the heading; use 13 px Monaco-first text with 17 px line height instead of 12 px / 14.4 px. Preserve table semantics, names, years and order.
2. Extend clickable labels across the project cell to at least 32 px high (36 px on taller screens). Keep + and external arrows as existing interaction cues; align wrapped button text under the title, not under +. Hotel Perle, The Bygone and Scout Motors remain plain text.
3. Mobile panels: 60 × 44 px CLOSE target, compact header, natural image proportions with contain fitting and viewport height limits. All source assets, captions and the Freeman website specimen remain intact. Joseph's four-piece gallery remains two columns on phones; Corey stays square. Scout has no supplied artwork panel and none was invented.
4. Add mobile-only PREV/NEXT text actions to the enlarged viewer. Existing desktop arrow-key controls are unchanged. Escape now dismisses only the topmost viewer; the next Escape returns to the index. Make the covered mobile table inert to prevent keyboard focus moving behind a panel; restore access on close or desktop resize.
5. Allow contained overflow only when available space cannot hold the readable index or project. No type shrinking, animations, dependencies, or production asset changes.

## Measurements

| Viewport | Document before / after | Index type before → after | Minimum index action height before → after | Final row bottom after |
|---|---|---|---|---|
| 375 × 812 | 375 × 812 / 375 × 812 | 12 → 13 px | 14.4 → 32.0 px | 736.1 px |
| 390 × 844 | 390 × 844 / 390 × 844 | 12 → 13 px | 14.4 → 32.0 px | 736.1 px |
| 430 × 932 | 430 × 932 / 430 × 932 | 12 → 13 px | 14.4 → 36.0 px | 792.1 px |
| 1440 × 900 | 1440 × 900 / 1440 × 900 | 13 → 13 px | 16.0 → 16.0 px | 827.1 px |

No horizontal or vertical document overflow at the four requested sizes. Index regions at 375/390/430 are respectively 665/697/785 px high, with equal client and scroll heights. All project images loaded; every mobile preview now uses contain fitting. All eleven panel screenshots and nine image-viewer screenshots were captured at each size, plus home and index: 176 before/after screenshots total.

Desktop: all 22 image pairs have exactly zero differing pixels at 1440 × 900. Desktop typography, composition and cropping remain as approved. The Escape correction is intentionally shared because the same functional bug existed on desktop.

Additional verification: all four Joseph images opened with touch; PREV/NEXT cycled correctly; viewer close restored figure focus; panel close restored row focus; Enter/Escape worked; hidden index was inert; final entry remained reachable; brand navigation and selected palette persisted. Repeated at 375 × 812, 390 × 844, 430 × 932, 320 × 568 and 812 × 375 with reduced-motion preference. No JavaScript exceptions or HTTP asset failures in the primary audit.

## Tradeoffs and limits

- 32–36 px index actions are a deliberate density compromise, not 44 px targets. Eighteen 44 px rows alone need 792 px, before headings, navigation and footer. Close and gallery controls use 44 px heights.
- At 375/390 px Ronnie's name wraps cleanly to two lines; complete visibility takes priority over forcing one line.
- At 320 × 568 the index needs 697 px in a 436 px region (261 px overflow). At 812 × 375 it needs 617 px in 227 px (390 px overflow). Only the content region scrolls. This is the smallest exception that preserves readable typography and all entries; panels can likewise scroll when needed.
- Desktop preview cropping is preserved to meet the approved-desktop constraint. Desktop enlarged images remain uncropped.
- No real-device Safari, VoiceOver, browser-chrome variation, or external destination availability testing was performed. External destinations and portfolio assets were not changed. Homepage remained unchanged.

## Local preview

From the mobile-refinement checkout, run:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/index/ (home: http://127.0.0.1:8765/). The current session already has this server running. No production deployment or merge was performed.

The companion mobile-audit directory contains report.html (all screenshot pairs), before/measurements.json, after/measurements.json, desktop-comparison.json, verification.json and the executable audit/verification scripts. The scripts use this workstation's installed Playwright and Chromium; they add no site dependencies.
