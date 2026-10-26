/* The cart, set like a gallery invoice, and its navigation count.
 * Works on any page with a .site-head nav. The cart lives in Shopify; this
 * only displays it and asks Shopify to change it. Visitors leave
 * colecalfee.com only for Shopify's secure checkout. */
import {cartStore, loadCart, updateLine, removeLine, prepareCheckout, formatMoney, isEdition, sizedImage} from "./storefront.js";

let dialog, toggle, list, subtotal, status, checkout, count, handoff;
let busy = false;
let describe = product => ({title: product.title});

/* Pages can describe their own works: the gallery keeps its titles, medium and plate numbers. */
export function setLineDescriber(describer) {
  describe = product => ({title: product.title, ...(describer(product) || {})});
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
    dialog.classList.remove("is-leaving");
    render(cartStore.cart);
  }
}

function lineItem(line) {
  const variant = line.merchandise;
  const product = variant.product;
  const work = describe(product);
  const item = element("li", "cart-line");

  const image = variant.image || product.featuredImage;
  const figure = element("div", "cart-plate");
  if (image) {
    const img = element("img");
    img.src = sizedImage(image.url, 360);
    img.alt = "";
    img.loading = "lazy";
    img.onerror = () => img.remove();
    figure.append(img);
  }

  const text = element("div", "cart-text");
  if (work.number) text.append(element("p", "cart-number", `No. ${work.number}`));
  const heading = element("div", "cart-heading");
  heading.append(element("p", "cart-title", work.title), element("p", "cart-price", formatMoney(line.cost.totalAmount)));
  text.append(heading);
  if (work.details) text.append(element("p", "cart-meta", work.details));
  const edition = isEdition(product);
  const kind = [edition ? "Edition print" : "Original", variant.title !== "Default Title" ? variant.title : ""].filter(Boolean).join(" · ");
  text.append(element("p", "cart-meta", kind));
  if (!variant.availableForSale) text.append(element("p", "cart-meta cart-alert", "No longer available"));

  const controls = element("div", "cart-controls");
  if (edition) {
    const stepper = element("div", "cart-stepper");
    const less = element("button", "", "−");
    const quantity = element("span", "", String(line.quantity));
    const more = element("button", "", "+");
    less.type = more.type = "button";
    less.setAttribute("aria-label", `One fewer ${work.title}`);
    more.setAttribute("aria-label", `One more ${work.title}`);
    quantity.setAttribute("aria-label", `Quantity ${line.quantity}`);
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
    stepper.append(less, quantity, more);
    controls.append(stepper);
  }
  const remove = element("button", "cart-remove", "Remove");
  remove.type = "button";
  remove.disabled = busy;
  remove.setAttribute("aria-label", `Remove ${work.title}`);
  remove.onclick = () => run(async () => {
    await removeLine(line.id);
    say(`${work.title} removed.`);
  });
  controls.append(remove);
  text.append(controls);

  item.append(figure, text);
  return item;
}

function render(cart) {
  const quantity = cart?.totalQuantity || 0;
  toggle.hidden = quantity === 0;
  toggle.querySelector("span").textContent = String(quantity);
  toggle.setAttribute("aria-label", `Cart, ${quantity} ${quantity === 1 ? "work" : "works"}`);

  const lines = cart?.lines.nodes || [];
  dialog.classList.toggle("is-empty", lines.length === 0);
  list.replaceChildren(...lines.map(lineItem));
  count.textContent = `${quantity} ${quantity === 1 ? "work" : "works"}`;
  subtotal.textContent = cart ? formatMoney(cart.cost.subtotalAmount) : "";
  const blocked = lines.some(line => !line.merchandise.availableForSale);
  checkout.disabled = busy || !lines.length || blocked;
  if (!busy) checkout.textContent = "Continue to checkout";
}

function build() {
  toggle = element("button", "cart-toggle");
  toggle.type = "button";
  toggle.hidden = true;
  toggle.setAttribute("aria-haspopup", "dialog");
  toggle.append("Cart ", element("span", "", "0"));
  toggle.onclick = openCart;
  document.querySelector(".site-head .nav")?.append(toggle);

  const today = new Intl.DateTimeFormat("en-GB", {day: "2-digit", month: "short", year: "numeric"}).format(new Date()).toUpperCase();
  dialog = element("dialog", "cart-panel");
  dialog.setAttribute("aria-labelledby", "cart-title");
  dialog.innerHTML = `
    <div class="cart-sheet">
      <header class="cart-top"><h2 id="cart-title">Cart</h2><button type="button" class="cart-close">Close ×</button></header>
      <div class="cart-body">
        <p class="cart-ledger"><span>Cole Calfee</span><span data-count></span><span>${today}</span></p>
        <p class="cart-empty">No works selected.</p>
        <ol class="cart-lines" aria-label="Works in your cart"></ol>
        <dl class="cart-totals">
          <div><dt>Subtotal</dt><dd data-subtotal></dd></div>
          <div class="cart-later"><dt>Shipping and taxes</dt><dd>At checkout</dd></div>
        </dl>
        <p class="cart-status" role="status" aria-live="polite"></p>
        <div class="cart-action">
          <button type="button" class="cart-checkout">Continue to checkout</button>
          <p class="cart-secure">Payment is completed on Shopify's secure checkout.</p>
        </div>
      </div>
      <div class="cart-handoff" role="status">
        <p class="cart-handoff-kicker">Secure checkout</p>
        <p class="cart-handoff-title"></p>
        <p class="cart-handoff-note">Continuing to Shopify to complete payment. Your browser's back button returns you here.</p>
      </div>
    </div>`;
  document.body.append(dialog);
  list = dialog.querySelector(".cart-lines");
  subtotal = dialog.querySelector("[data-subtotal]");
  count = dialog.querySelector("[data-count]");
  status = dialog.querySelector(".cart-status");
  checkout = dialog.querySelector(".cart-checkout");
  handoff = dialog.querySelector(".cart-handoff-title");

  dialog.querySelector(".cart-close").onclick = () => dialog.close();
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => say(""));

  checkout.onclick = () => run(async () => {
    checkout.textContent = "Confirming availability…";
    say("");
    const {cart, unavailable} = await prepareCheckout();
    if (unavailable.length) {
      say(`${unavailable.map(line => describe(line.merchandise.product).title).join(", ")} is no longer available. Remove it to continue.`);
      return;
    }
    // Say where the visitor is going, and with what, while the browser leaves.
    const works = cart.lines.nodes.map(line => describe(line.merchandise.product).title);
    handoff.textContent = `${works.join(", ")} — ${formatMoney(cart.cost.subtotalAmount)}`;
    dialog.classList.add("is-leaving");
    window.location.assign(cart.checkoutUrl);
    /* Stay in the handoff state while the browser navigates away. */
    await new Promise(resolve => setTimeout(resolve, 8000));
  });

  /* Returning from checkout with the back button restores a frozen page; re-read the cart. */
  window.addEventListener("pageshow", event => {
    if (!event.persisted) return;
    busy = false;
    dialog.classList.remove("is-leaving");
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
