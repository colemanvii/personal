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

/* Try to display the product's own Shopify image. If the storefront blocks
   cross-origin reads, leave the photo hidden rather than show a broken image. */
const SHOPIFY_HANDLES = {flowers:"flowers-in-mccarty-vase","red-sea":"red-sea"};
document.querySelectorAll("[data-product]").forEach(async card => {
  const handle = SHOPIFY_HANDLES[card.dataset.product];
  if (!handle) return;
  try {
    const response = await fetch("https://241880-3.myshopify.com/products/" + handle + ".js", {mode:"cors"});
    if (!response.ok) return;
    const product = await response.json();
    const raw = product.featured_image || product.images?.[0];
    const source = typeof raw === "string" ? raw : raw?.src;
    if (!source) return;
    const image = card.querySelector(".work-image img");
    image.onload = () => { image.hidden = false; image.parentElement.hidden = false; };
    image.src = source.startsWith("//") ? "https:" + source : source;
  } catch (_) {
    // A restricted Shopify storefront may prevent cross-origin image discovery.
  }
});