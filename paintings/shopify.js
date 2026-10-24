/* Add each product's real Shopify checkout / product URL below.
   Prefer Shopify product URLs or share links where Shopify handles live inventory,
   shipping and tax. Never invent or hardcode prices/availability on this site. */
const SHOPIFY_PRODUCTS = Object.freeze({
  flowers: "https://241880-3.myshopify.com/products/flowers-in-mccarty-vase",
  "red-sea": "https://241880-3.myshopify.com/products/red-sea"
});
document.querySelectorAll("[data-product]").forEach(card => {
  const url = SHOPIFY_PRODUCTS[card.dataset.product];
  if (!url) return;
  try {
    const destination = new URL(url);
    if (destination.protocol !== "https:") return;
    const link = card.querySelector("[data-checkout]");
    const pending = card.querySelector("[data-pending]");
    link.href = destination.href;
    link.hidden = false;
    pending.hidden = true;
  } catch (_) {
    // Missing or invalid links stay in inquiry mode, never simulate checkout.
  }
});
