/* Available: live price and one-click checkout from Shopify.
 * Without Shopify (offline, blocked, sold), each work keeps its Inquire link. */
import { fetchProducts, priceLabel, storefront } from "./storefront.js";

const pieces = [...document.querySelectorAll(".piece[data-handle]")];

async function checkout(product, button) {
  button.disabled = true;
  button.textContent = "Opening checkout…";
  try {
    const id = product.selectedOrFirstAvailableVariant?.id || product.variants.nodes.find(v => v.availableForSale)?.id;
    const data = await storefront(
      "mutation DirectCheckout($id: ID!) { cartCreate(input: {lines: [{merchandiseId: $id, quantity: 1}]}) { cart { checkoutUrl } userErrors { message } } }",
      { id }
    );
    const url = data.cartCreate?.cart?.checkoutUrl;
    if (!url) throw new Error(data.cartCreate?.userErrors?.[0]?.message || "Checkout is unavailable.");
    window.location.assign(url);
  } catch (error) {
    button.disabled = false;
    button.textContent = "Checkout unavailable. Try again";
  }
}

if (pieces.length) {
  fetchProducts(pieces.map(p => p.dataset.handle)).then(products => {
    for (const piece of pieces) {
      const product = products.get(piece.dataset.handle);
      if (!product) continue;
      const price = piece.querySelector(".price");
      const buy = piece.querySelector("[data-buy]");
      if (product.availableForSale) {
        price.textContent = priceLabel(product);
        price.hidden = false;
        buy.hidden = false;
        buy.addEventListener("click", () => checkout(product, buy));
      } else {
        price.textContent = "Sold";
        price.hidden = false;
        piece.querySelector("[data-inquire]").hidden = true;
      }
    }
  }).catch(() => { /* Inquire stays. */ });
}
