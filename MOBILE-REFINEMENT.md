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
