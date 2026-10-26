# Test harness limitations

These are limits of the automated browser tests, not of the site.

- **iPhone is emulated.** The "iphone" tests run Chromium with iPhone 15 viewport, user agent and touch settings. They do not run Safari. Safe areas, Safari's toolbars and real touch gestures need checking on a device.
- **Checkout handoff is tested on desktop only.** The test holds the request to Shopify checkout, records what the visitor sees as the page leaves, then cancels the request so no checkout loads. In iPhone emulation, Chromium's error page for the cancelled request races the test's next navigation, so the iPhone journey stops at the cart review. The real handoff has been verified by hand on an iPhone.
- **No screenshots during the handoff.** Playwright waits for a pending navigation to finish before taking a screenshot, and the test never lets checkout load. The handoff is checked from the page's state at `beforeunload` instead.
- **Stand-in images.** Where `cdn.shopify.com` is unreachable, `STAND_IN_IMAGES=1` draws plain 4:5 tiles in place of artwork photographs. Every Shopify photograph of these works is 4:5, so composition is accurate; the paintings themselves are not shown.
- **Swipes are synthetic.** The swipe test dispatches touch events on the viewer. It checks the gesture logic, not how a swipe feels on glass.
- **No order is placed.** No test completes a payment.
