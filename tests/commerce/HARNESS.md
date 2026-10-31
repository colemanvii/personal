# Test harness limitations

These are limits of the automated browser tests, not of the site.

- **iPhone is emulated.** The "iphone" tests run Chromium at 390 × 844 and 375 × 667 with touch enabled. They do not run Safari. Safe areas, Safari's toolbars and real touch gestures need checking on a device.
- **Checkout is mocked in the regression suite.** `e2e.cjs` reads real product data, but every Shopify mutation is answered in the browser by a mock and never sent. A tripwire fails the run if one reaches Shopify. The tests check the request the page builds (one variant, quantity 1) and that it hands off to the checkout URL Shopify returns.
- **The live checkout is manual.** `live-checkout.smoke.cjs` creates one real checkout and cancels the navigation to it, so the checkout page never loads. It refuses to run without `CONFIRM_LIVE_CHECKOUT=yes`, and only the manually triggered workflow sets that. Each run leaves an empty, abandoned Shopify checkout with no customer details.
- **No order is placed.** No test completes a payment.
