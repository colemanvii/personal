/* Cart drawer and navigation count. Works on any page with a .site-head nav.
 * The cart lives in Shopify; this only displays it and asks Shopify to change
 * it. Visitors leave colecalfee.com only for Shopify's secure checkout. */
import {cartStore, loadCart, updateLine, removeLine, prepareCheckout, formatMoney, isEdition, sizedImage} from "./storefront.js";

let dialog, toggle, list, subtotal, status, checkout;
let busy = false;
let titleFor = product => product.title;

/* Pages can supply their own display titles (the gallery keeps its own capitalization). */
export function setTitleResolver(resolver) {
  titleFor = product => resolver(product) || product.title;
  if (dialog) render(cartStore.cart);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function say(message) {
  status.textContent = message || "";
}

async function run(task) {
  if (busy) return;
  busy = true;
  dialog.setAttribute("aria-busy", "true");
  render(cartStore.cart);
  try {
    await task();
  } catch (error) {
    say(error.message || "Something went wrong. Please try again.");
  } finally {
    busy = false;
    dialog.removeAttribute("aria-busy");
    render(cartStore.cart);
  }
}

function lineItem(line) {
  const variant = line.merchandise;
  const product = variant.product;
  const item = element("li", "cart-line");

  const image = variant.image || product.featuredImage;
  const figure = element("div", "cart-thumb");
  if (image) {
    const img = element("img");
    img.src = sizedImage(image.url, 240);
    img.alt = "";
    img.loading = "lazy";
    img.onerror = () => img.remove();
    figure.append(img);
  }

  const text = element("div", "cart-text");
  text.append(element("p", "cart-title", titleFor(product)));
  if (variant.title !== "Default Title") text.append(element("p", "cart-meta", variant.title));
  if (!variant.availableForSale) text.append(element("p", "cart-meta cart-alert", "No longer available"));

  const controls = element("div", "cart-controls");
  if (isEdition(product)) {
    const stepper = element("div", "cart-stepper");
    const less = element("button", "", "−");
    const count = element("span", "", String(line.quantity));
    const more = element("button", "", "+");
    less.type = more.type = "button";
    less.setAttribute("aria-label", `One fewer ${titleFor(product)}`);
    more.setAttribute("aria-label", `One more ${titleFor(product)}`);
    count.setAttribute("aria-label", `Quantity ${line.quantity}`);
    less.disabled = more.disabled = busy;
    less.onclick = () => run(async () => {
      say("");
      if (line.quantity <= 1) await removeLine(line.id);
      else await updateLine(line.id, line.quantity - 1);
    });
    more.onclick = () => run(async () => {
      say("");
      const {warnings} = await updateLine(line.id, line.quantity + 1);
      if (warnings.length) say(warnings[0].message);
    });
    stepper.append(less, count, more);
    controls.append(stepper);
  }
  const remove = element("button", "cart-remove", "Remove");
  remove.type = "button";
  remove.disabled = busy;
  remove.setAttribute("aria-label", `Remove ${titleFor(product)}`);
  remove.onclick = () => run(async () => {
    await removeLine(line.id);
    say(`${titleFor(product)} removed.`);
  });
  controls.append(remove);
  text.append(controls);

  item.append(figure, text, element("p", "cart-price", formatMoney(line.cost.totalAmount)));
  return item;
}

function render(cart) {
  const quantity = cart?.totalQuantity || 0;
  toggle.hidden = quantity === 0;
  toggle.querySelector("span").textContent = String(quantity);
  toggle.setAttribute("aria-label", `Cart, ${quantity} ${quantity === 1 ? "item" : "items"}`);

  const lines = cart?.lines.nodes || [];
  dialog.classList.toggle("is-empty", lines.length === 0);
  list.replaceChildren(...lines.map(lineItem));
  subtotal.textContent = cart ? formatMoney(cart.cost.subtotalAmount) : "";
  const blocked = lines.some(line => !line.merchandise.availableForSale);
  checkout.disabled = busy || !lines.length || blocked;
  if (!busy) checkout.textContent = "Checkout";
}

function build() {
  toggle = element("button", "cart-toggle");
  toggle.type = "button";
  toggle.hidden = true;
  toggle.setAttribute("aria-haspopup", "dialog");
  toggle.append("Cart ", element("span", "", "0"));
  toggle.onclick = openCart;
  document.querySelector(".site-head .nav")?.append(toggle);

  dialog = element("dialog", "cart-panel");
  dialog.setAttribute("aria-labelledby", "cart-title");
  dialog.innerHTML = `
    <div class="cart-sheet">
      <header class="cart-top"><h2 id="cart-title">Cart</h2><button type="button" class="cart-close">Close ×</button></header>
      <div class="cart-body">
        <p class="cart-empty">Your cart is empty.</p>
        <ul class="cart-lines" aria-label="Works in your cart"></ul>
      </div>
      <footer class="cart-foot">
        <p class="cart-status" role="status" aria-live="polite"></p>
        <div class="cart-subtotal"><span>Subtotal</span><span data-subtotal></span></div>
        <p class="cart-note">Shipping and taxes are calculated at checkout.</p>
        <button type="button" class="cart-checkout">Checkout</button>
        <p class="cart-secure">Secure payment by Shopify</p>
      </footer>
    </div>`;
  document.body.append(dialog);
  list = dialog.querySelector(".cart-lines");
  subtotal = dialog.querySelector("[data-subtotal]");
  status = dialog.querySelector(".cart-status");
  checkout = dialog.querySelector(".cart-checkout");

  dialog.querySelector(".cart-close").onclick = () => dialog.close();
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => say(""));

  checkout.onclick = () => run(async () => {
    checkout.textContent = "Confirming availability…";
    say("");
    const {cart, unavailable} = await prepareCheckout();
    if (unavailable.length) {
      say(`${unavailable.map(line => titleFor(line.merchandise.product)).join(", ")} is no longer available. Remove it to continue.`);
      return;
    }
    checkout.textContent = "Opening secure checkout…";
    window.location.assign(cart.checkoutUrl);
    /* Leave the button busy while the browser navigates away. */
    await new Promise(resolve => setTimeout(resolve, 8000));
  });

  /* Returning from checkout with the back button restores a frozen page; re-read the cart. */
  window.addEventListener("pageshow", event => {
    if (!event.persisted) return;
    busy = false;
    loadCart().catch(() => {}).finally(() => render(cartStore.cart));
  });

  cartStore.subscribe(render);
  render(null);
}

export function openCart() {
  if (!dialog.open) dialog.showModal();
  dialog.querySelector(".cart-close").focus();
}

export function mountCart() {
  if (dialog) return;
  build();
  loadCart().catch(() => {});
}
