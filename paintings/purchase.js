/* Purchasing for the paintings gallery.
 *
 * The gallery markup stays the record of the work and its no-JavaScript
 * fallback; paintings/gallery.js owns the viewer. This script asks Shopify
 * for live price, images and availability, marks each wall label, and fills
 * the viewer's sale line: availability and price, and for available works one
 * quiet action. Shopify decides what is for sale; the page decides where each
 * work hangs. */
import {fetchProducts, addToCart, choiceOptions, findVariant, initialSelection, valueAvailable, isEdition, priceLabel, formatMoney, sizedImage, cartStore} from "/assets/js/storefront.js";
import {mountCart, openCart, setLineDescriber} from "/assets/js/cart.js";
import {setImage, hasOwnPhoto, titleOf, detailsOf, numberOf, currentPiece} from "/paintings/gallery.js";

const FRESH_FOR = 60 * 1000;
const pieces = [...document.querySelectorAll(".gallery .piece[data-handle]")];
const dialog = document.getElementById("painting-detail");
const label = document.getElementById("detail-label");
const state = document.getElementById("detail-state");
const price = document.getElementById("detail-price");
const action = document.getElementById("detail-action");
const sale = label.querySelector(".label-sale");
const more = label.querySelector(".label-more");

const products = new Map();
let loadState = "loading";
let loadedAt = 0;
let current = null; // {piece, product, selection}

const pieceFor = handle => pieces.find(p => p.dataset.handle === handle);

mountCart();
setLineDescriber(product => {
  const piece = pieceFor(product.handle);
  return piece && {title: titleOf(piece), details: detailsOf(piece), number: numberOf(piece)};
});

/* ---------- Viewer: the sale line, options, and other views ---------- */

const views = document.createElement("div");
views.className = "buy-views";
views.setAttribute("role", "group");
views.setAttribute("aria-label", "More views");
views.hidden = true;

/* Options (print editions only) sit above the sale line; the action sits in it.
   Below it, a status line that stays visible even when a work has just sold,
   and a short note shown only for works on sale. */
const panel = document.createElement("section");
panel.className = "buy";
panel.hidden = true;
panel.setAttribute("aria-label", "Purchase options");
panel.innerHTML = `<div class="buy-options"></div>`;
const after = document.createElement("div");
after.className = "buy-after";
after.innerHTML = `<p class="buy-note">Shipping and taxes are calculated at checkout, through Shopify.</p>`;
const status = document.createElement("p");
status.className = "buy-status";
status.setAttribute("role", "status");
status.setAttribute("aria-live", "polite");
sale.before(panel);
sale.after(status, after);
more.prepend(views);

const $ = selector => panel.querySelector(selector);
const addButton = document.createElement("button");
addButton.type = "button";
addButton.className = "buy-add";
action.append(addButton);
const say = message => {
  status.textContent = message || "";
  // Messages sit just below the sale line; make sure the visitor sees them.
  if (message) status.scrollIntoView({block: "nearest"});
};

function inCart(variant) {
  return cartStore.cart?.lines.nodes.find(line => line.merchandise.id === variant?.id);
}

function setState(text, sold) {
  state.textContent = text;
  state.dataset.state = sold ? "sold" : "available";
}

function renderOptions(product, selection) {
  const holder = $(".buy-options");
  holder.replaceChildren();
  for (const option of choiceOptions(product)) {
    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = option.name;
    fieldset.append(legend);
    for (const {name: value} of option.optionValues) {
      const choice = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `option-${option.name}`;
      input.value = value;
      input.checked = selection[option.name] === value;
      input.onchange = () => {
        current.selection = {...current.selection, [option.name]: value};
        say("");
        renderPanel();
      };
      const available = valueAvailable(product, selection, option.name, value);
      choice.className = available ? "" : "is-unavailable";
      const text = document.createElement("span");
      text.textContent = value;
      choice.append(input, text);
      if (!available) {
        const note = document.createElement("small");
        note.textContent = "Sold out";
        choice.append(note);
      }
      fieldset.append(choice);
    }
    holder.append(fieldset);
  }
}

/* Every work with more than one photograph can be examined from each, sold or not.
   Where the site hangs a work in its own photograph, that photograph replaces
   Shopify's featured image; Shopify's other views follow it. */
function renderViews(product, variant) {
  const shopify = product?.images.nodes || [];
  const own = hasOwnPhoto(current.piece);
  const images = own && shopify.length ? [{url: null, thumb: current.piece.querySelector(".image-button img").currentSrc || current.piece.querySelector(".image-button img").getAttribute("src")}, ...shopify.slice(1)] : shopify;
  views.replaceChildren();
  views.hidden = images.length < 2;
  if (variant?.image && !(own && variant.image.url === shopify[0]?.url)) setImage(variant.image.url);
  if (images.length < 2) return;
  const title = titleOf(current.piece);
  images.forEach((image, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `${title}, view ${i + 1} of ${images.length}`);
    button.setAttribute("aria-pressed", String(i === 0));
    const img = document.createElement("img");
    img.src = image.url ? sizedImage(image.url, 200) : image.thumb;
    img.alt = "";
    img.onerror = () => button.remove();
    button.append(img);
    button.onclick = () => {
      setImage(image.url, image.altText || title);
      views.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === button)));
    };
    views.append(button);
  });
}

function renderPanel() {
  const {product} = current;
  addButton.onclick = null;

  if (!product) {
    price.textContent = "";
    $(".buy-options").replaceChildren();
    addButton.disabled = loadState === "loading";
    addButton.textContent = loadState === "loading" ? "Checking availability…" : "Try again";
    if (loadState === "error") {
      say("Availability could not be loaded.");
      addButton.onclick = () => { say(""); loadProducts().then(() => current && showPiece(current.piece)); };
    }
    return;
  }

  const variant = findVariant(product, current.selection);
  const edition = isEdition(product);
  price.textContent = variant ? formatMoney(variant.price) : priceLabel(product);
  if (!variant || !variant.availableForSale) setState(edition ? "Sold out" : "Sold", true);
  else setState(edition ? "Edition print" : "Available", false);
  renderOptions(product, current.selection);

  const line = inCart(variant);
  if (!variant || !variant.availableForSale) {
    addButton.disabled = true;
    addButton.textContent = edition ? "Sold out" : "Sold";
  } else if (line && !edition) {
    addButton.disabled = false;
    addButton.textContent = "In your cart";
    addButton.onclick = showCart;
  } else {
    addButton.disabled = false;
    addButton.textContent = line ? "Add another" : "Add to cart";
    addButton.onclick = () => add(variant);
  }
}

async function add(variant) {
  const added = current;
  addButton.disabled = true;
  addButton.textContent = "Adding…";
  say("");
  try {
    const {warnings} = await addToCart(variant.id, 1);
    if (current !== added) return;
    const soldOut = warnings.find(w => w.code === "MERCHANDISE_OUT_OF_STOCK");
    if (soldOut) {
      say("This work has just sold.");
      await refresh(added.product.handle);
      return;
    }
    say(warnings[0]?.message || "Added to your cart.");
  } catch (error) {
    say(`${error.message} Please try again.`);
  }
  if (current === added) renderPanel();
}

function showCart() {
  dialog.close();
  openCart();
}

function showPiece(piece) {
  const product = products.get(piece.dataset.handle) || null;
  // Keep a message (such as "This work has just sold.") when the same work is shown again.
  if (current?.piece !== piece) say("");
  current = {piece, product, selection: product ? initialSelection(product) : {}};
  const buyable = loadState !== "ready" || Boolean(product?.availableForSale);
  dialog.classList.toggle("is-buyable", buyable);
  panel.hidden = after.hidden = action.hidden = !buyable;
  if (!buyable) price.textContent = "";
  if (product && !product.availableForSale) setState(isEdition(product) ? "Sold out" : "Sold", true);
  else if (!product && piece.querySelector('.sale[data-state="sold"]')) setState("Sold", true);
  renderViews(product, product && findVariant(product, current.selection));
  if (buyable) renderPanel();
  if (loadState === "ready" && Date.now() - loadedAt > FRESH_FOR) refresh(piece.dataset.handle);
}

dialog.addEventListener("painting:show", event => showPiece(event.detail.piece));
if (currentPiece()) showPiece(currentPiece()); // opened from a shared link before this module ran
dialog.addEventListener("close", () => { current = null; });
cartStore.subscribe(() => { if (current && !panel.hidden) renderPanel(); });

/* ---------- Curation and commerce ----------
   The page's HTML decides where every work hangs: Available Works or the
   Selected Archive, its order and its number. Shopify never moves a work.
   It decides only each work's live state: the wall label, price, and
   whether it can be added to the cart. A work that sells shows SOLD where
   it hangs until the page is deliberately republished with it in the
   archive. If Shopify cannot be reached, the composition is unchanged and
   nothing is offered for sale. */

/* ---------- Wall labels: a quiet state, never a price ---------- */

function renderCaption(piece) {
  const product = products.get(piece.dataset.handle);
  const sale = piece.querySelector(".sale");
  sale.removeAttribute("data-live");
  if (!product) return; // Unknown to Shopify: keep the page's own record.
  const title = titleOf(piece);
  const imageButton = piece.querySelector(".image-button");
  sale.replaceChildren();
  if (product.availableForSale) {
    sale.dataset.state = "available";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "sale-open";
    open.textContent = "Available";
    open.setAttribute("aria-label", `${title} is available. View the work`);
    open.onclick = () => imageButton.click();
    sale.append(open);
    imageButton.setAttribute("aria-label", `View ${title}, available`);
  } else {
    sale.dataset.state = "sold";
    sale.textContent = isEdition(product) ? "Sold out" : "Sold";
    imageButton.setAttribute("aria-label", `View ${title}, sold`);
  }
}

async function loadProducts() {
  loadState = "loading";
  pieces.forEach(piece => piece.querySelector(".sale").setAttribute("data-live", "pending"));
  if (current) renderPanel();
  try {
    const fetched = await fetchProducts(pieces.map(p => p.dataset.handle));
    fetched.forEach((product, handle) => products.set(handle, product));
    loadState = "ready";
    loadedAt = Date.now();
  } catch (error) {
    loadState = "error";
  }
  pieces.forEach(renderCaption);
  if (current) showPiece(current.piece);
}

async function refresh(handle) {
  try {
    const fetched = await fetchProducts([handle]);
    const product = fetched.get(handle);
    if (!product) return;
    products.set(handle, product);
    renderCaption(pieceFor(handle));
    if (current?.piece.dataset.handle === handle) {
      current.product = product;
      // No longer for sale: show it as sold where it hangs, with no action.
      if (!product.availableForSale) showPiece(current.piece);
      else {
        if (!findVariant(product, current.selection)?.availableForSale) current.selection = initialSelection(product);
        renderPanel();
      }
    }
  } catch (_) {
    // Keep the last known state; Shopify still validates at cart and checkout.
  }
}

await loadProducts();
