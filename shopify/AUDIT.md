# Shopify gallery audit — 26 October 2026

Source: `study/shopify-handoff-001`, commit `c5377565be5799733077f9edb707b4339fc5387c`.
Working branch: `study/shopify-gallery-refinement-001` (local only).

Reviewed the Liquid section, shared portfolio CSS/JS, paintings page, handoff script and purchase study. Visually inspected colecalfee.com and the public Red Sea Shopify page. The public Shopify page is not the unpublished CF 3.0 preview. No theme, product, inventory, cart, checkout or deployment was modified. Mobile findings below are source-based; device and CF 3.0 integration validation remain outstanding.

## Existing strengths

The Liquid section uses real product data, selected-or-first-available variants, Shopify money formatting, native product form submission, variant IDs and availability. Preserve those foundations. The artwork is uncropped; the purchase action is a restrained ruled row. The portfolio already establishes Helvetica Neue, compact archival metadata, hairline rules and generous unboxed space.

## Five highest-impact improvements, in priority order

### 1. Make the transition feel like one gallery

Evidence: paintings/index.html opens purchase links in a new tab. The Liquid section leaves the theme header and footer separately controlled (lines 3–5) and supplies only a return link below the form (65). The public store uses a serif identity and a different navigation hierarchy.

Implementation: matching brand and Work Index / Paintings / About links, with a restrained native Shopify Cart link and count. Put the gallery return route before the artwork on mobile. Use same-tab product navigation and return anchors for the originating artwork. Header integration must be explicit and opt-in in a dedicated template; do not hide all theme headers with global CSS. Review cart continuity alongside product continuity before applying anything to a theme.

### 2. Rebuild the mobile reading and buying hierarchy

Evidence: section line 15 gives the entire product description 11px monospaced text. Line 28 reserves at least 36dvh for media, followed by a 28px gap; the full description precedes price and purchase controls. Long copy can separate artwork from the buying decision. The portfolio contact sheet also uses 9px titles, very small purchase text and a locked viewport on mobile.

Implementation: artwork, compact classification/title, short factual metadata, live price and availability, options, purchase action, then extended description and verified fulfillment information. Use normal document scrolling. Keep artwork uncropped; avoid mandatory blank media height. Aim for 15–16px prose and controls, 12px metadata, 24–28px mobile title and at least 44px interactive targets. Keep one primary action. Do not add a permanent sticky purchase bar before testing whether it is needed. Give available works a usable purchase route from the enlarged gallery view.

### 3. Describe originals and prints accurately

Evidence: line 38 always says ORIGINAL WORK. Line 50 always says Edition / Option. Availability language depends on whether a product has variants rather than what kind of work it is (41–46, 61, 84).

Implementation: an explicit product metafield classifies original painting versus editioned print, with a neutral Artwork fallback. Use factual medium, dimensions, edition size, paper and signing information only when supplied by the merchant. Originals use Sold; prints use Sold out unless edition completion is explicitly recorded. Label actual Shopify options, such as Size or Framing. Edition size is provenance, not remaining stock; never infer scarcity or one-of-one status from variant count.

### 4. Consolidate one visual system

Evidence: section line 9 hardcodes the older warm-paper palette (#f3f1ea). The final effective portfolio CSS uses white #ffffff, ink #111111, muted #626262, rule #d9d9d9 and accent #a43f33. Multiple historical CSS overrides make the intended contract difficult to maintain.

Implementation: use those current colors as the default shared contract. Helvetica Neue / Helvetica / Arial for navigation, titles, prose and controls; Monaco / Menlo for short archival facts only. Use 18px mobile and 30px desktop gutters, and a spacing scale of 4 / 8 / 12 / 18 / 24 / 36 / 48 / 72px. Separate the broad page shell from a narrower product composition. Scope Shopify styles to the gallery template. Maintain visible keyboard focus and adequate contrast. Palette choices stored in portfolio sessionStorage do not automatically cross domains; either explicitly carry an allowlisted tone or keep a documented shared white default.

### 5. Support close inspection and robust purchase states

Evidence: lines 33–34 render only the product featured image; no detail gallery or zoom is present. Variant changes update price, availability and URL but not media (78–85). The form ID is fixed (48). Changed price/availability have no live announcement. Initialization occurs only when the inline script executes; theme-editor section replacement needs validation. Without JavaScript, selecting another variant can leave the initially rendered availability and disabled button stale.

Implementation: render actual Shopify product media with accessible enlargement and lightweight navigation, honor variant media and supplied alt text, and provide responsive image sizes. Use section-unique IDs, a polite status region, predictable focus and resilient initialization. Keep native form submission and Shopify server-side stock validation. Provide a usable no-JavaScript variant path. Do not replace native checkout with custom transaction logic. Ensure the dedicated template has only one product form.

## Implementation and validation boundary

Next deliverables should be real scoped CSS, Liquid sections/snippets and minimal JavaScript, plus installation instructions and a verification checklist. The existing static purchase study is reference only, not a production deliverable.

Before theme installation, verify available/sold originals; available/sold-out print variants; deep-linked variants; changing price and media; long titles/descriptions; missing metadata/images; keyboard and screen-reader behavior; no-JavaScript flow; and section reload behavior. Check 320, 375, 390, 430, 768 and 1440px widths with portrait and landscape artwork. In an explicitly approved preview, verify add-to-cart, server rejection when inventory changes, cart and checkout handoff without placing an order.

The installed CF 3.0 theme layout, scripts, template assignment and preview URL are not part of this repository snapshot. They must be inspected read-only before making claims about integration or proposing exact header replacement steps. Deployment, publishing and any modification to CF 2.0 or CF 3.0 require approval.
