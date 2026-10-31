# Test harness limitations

These are limits of the automated browser tests, not of the site.

- **iPhone is emulated.** The "iphone" tests run Chromium at 390 × 844 and 375 × 667 with touch enabled. They do not run Safari. Safe areas, Safari's toolbars and real touch gestures need checking on a device.
- **Checkout handoff stops at the door.** The purchase test lets the page create a real Shopify checkout, records where the browser is sent, then cancels that navigation so checkout never loads. Each run leaves an empty, abandoned Shopify checkout with no customer details; no order is placed.
- **No order is placed.** No test completes a payment.
