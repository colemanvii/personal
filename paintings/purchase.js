/* Purchase portal for the paintings gallery.
 *
 * The gallery markup stays the record of the work and its no-JavaScript
 * fallback. This script asks Shopify for live price, images and availability,
 * then turns the existing enlarged view into a purchase panel for available
 * works. Shopify decides what is for sale; the page never overrides it. */
import {fetchProducts, addToCart, choiceOptions, findVariant, initialSelection, valueAvailable, isEdition, priceLabel, formatMoney, sizedImage, cartStore} from "/assets/js/storefront.js";
import {mountCart, openCart, setTitleResolver} from "/assets/js/cart.js";

const FRESH_FOR = 60 * 1000;
const pieces = [...document.querySelectorAll(".gallery .piece[data-handle]")];
const dialog = document.getElementById("painting-detail");
const detailImage = document.getElementById("detail-image");
const detailInfo = document.getElementById("detail-info");

const products = new Map();
let loadState = "loading";
let loadedAt = 0;
let current = null; // {piece, product, selection}

const pieceFor = handle => pieces.find(p => p.dataset.handle === handle);
const titleOf = piece => piece.querySelector(".caption h2").textContent;
const detailsOf = piece => piece.querySelector(".caption p")?.textContent || "";

mountCart();
setTitleResolver(product => {
  const piece = pieceFor(product.handle);
  return piece && titleOf(piece);
});

/* ---------- Purchase panel ---------- */

const panel = document.createElement("section");
panel.className = "buy";
panel.hidden = true;
panel.setAttribute("aria-labelledby", "buy-title");
panel.innerHTML = `
  <h2 id="buy-title" class="buy-title"></h2>
  <p class="buy-details"></p>
  <p class="buy-price"></p>
  <p class="buy-state"></p>
  <div class="buy-options"></div>
  <div class="buy-views" role="group" aria-label="More views"></div>
  <div class="buy-action">
    <button type="button" class="buy-add"></button>
    <p class="buy-status" role="status" aria-live="polite"></p>
  </div>
  <p class="buy-note">Shipping and taxes are calculated at checkout. Payment is handled securely by Shopify.</p>`;
dialog.querySelector(".full-art").after(panel);

const $ = selector => panel.querySelector(selector);
const addButton = $(".buy-add");
const say = message => { $(".buy-status").textContent = message || ""; };

function inCart(variant) {
  return cartStore.cart?.lines.nodes.find(line => line.merchandise.id === variant?.id);
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
      const label = document.createElement("label");
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
      label.className = available ? "" : "is-unavailable";
      const text = document.createElement("span");
      text.textContent = value;
      label.append(input, text);
      if (!available) {
        const note = document.createElement("small");
        note.textContent = "Sold out";
        label.append(note);
      }
      fieldset.append(label);
    }
    holder.append(fieldset);
  }
}

function renderViews(product, variant) {
  const holder = $(".buy-views");
  const images = product.images.nodes;
  holder.replaceChildren();
  holder.hidden = images.length < 2;
  if (variant?.image) showImage(variant.image);
  if (images.length < 2) return;
  images.forEach((image, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `View ${i + 1} of ${images.length}`);
    button.setAttribute("aria-pressed", String((detailImage.dataset.url || images[0].url) === image.url));
    const img = document.createElement("img");
    img.src = sizedImage(image.url, 160);
    img.alt = "";
    img.onerror = () => button.remove();
    button.append(img);
    button.onclick = () => {
      showImage(image);
      holder.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === button)));
    };
    holder.append(button);
  });
}

function showImage(image) {
  detailImage.src = sizedImage(image.url, 2000);
  detailImage.dataset.url = image.url;
}

function renderPanel() {
  const {piece, product} = current;
  $(".buy-title").textContent = titleOf(piece);
  $(".buy-details").textContent = detailsOf(piece);
  const button = addButton;
  button.onclick = null;

  if (!product) {
    $(".buy-price").textContent = "";
    $(".buy-state").textContent = "";
    $(".buy-options").replaceChildren();
    $(".buy-views").hidden = true;
    button.disabled = loadState === "loading";
    button.textContent = loadState === "loading" ? "Checking availability…" : "Try again";
    if (loadState === "error") {
      say("Live prices could not be loaded.");
      button.onclick = () => { say(""); loadProducts().then(() => openPiece(piece)); };
    }
    return;
  }

  const variant = findVariant(product, current.selection);
  const edition = isEdition(product);
  $(".buy-price").textContent = variant ? formatMoney(variant.price) : priceLabel(product);
  $(".buy-state").textContent = !variant ? "Unavailable" : variant.availableForSale ? (edition ? "Edition print · Available" : "Original · Available") : (edition ? "Sold out" : "Sold");
  $(".buy-state").classList.toggle("is-sold", !variant?.availableForSale);
  renderOptions(product, current.selection);
  renderViews(product, variant);

  const line = inCart(variant);
  if (!variant || !variant.availableForSale) {
    button.disabled = true;
    button.textContent = edition ? "Sold out" : "Sold";
  } else if (line && !edition) {
    button.disabled = false;
    button.textContent = "In your cart — view cart";
    button.onclick = showCart;
  } else {
    button.disabled = false;
    button.textContent = line ? "Add another" : "Add to cart";
    button.onclick = () => add(variant);
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

function openPiece(piece) {
  const product = products.get(piece.dataset.handle) || null;
  current = {piece, product, selection: product ? initialSelection(product) : {}};
  say("");
  delete detailImage.dataset.url;
  const sold = product && !product.availableForSale;
  const buyable = loadState !== "ready" ? true : Boolean(product && product.availableForSale);
  dialog.classList.toggle("is-buyable", buyable);
  panel.hidden = !buyable;
  if (product) detailInfo.textContent = detailsOf(piece) + (sold ? (isEdition(product) ? " · SOLD OUT" : " · SOLD") : "");
  if (buyable) renderPanel();
  if (loadState === "ready" && Date.now() - loadedAt > FRESH_FOR) refresh(piece.dataset.handle);
}

/* Runs after the gallery's own enlarge handler has filled the dialog. */
pieces.forEach(piece => {
  piece.querySelector(".image-button").addEventListener("click", () => openPiece(piece));
});
dialog.addEventListener("close", () => { current = null; });
cartStore.subscribe(() => { if (current && !panel.hidden) renderPanel(); });

/* ---------- Gallery captions ---------- */

function renderCaption(piece) {
  const product = products.get(piece.dataset.handle);
  const sale = piece.querySelector(".sale");
  sale.removeAttribute("data-live");
  if (!product) return; // Unknown to Shopify: keep the page's own record.
  const title = titleOf(piece);
  const imageButton = piece.querySelector(".image-button");
  sale.replaceChildren();
  if (product.availableForSale) {
    const price = document.createElement("button");
    price.type = "button";
    price.className = "sale-price";
    price.textContent = priceLabel(product);
    price.setAttribute("aria-label", `${title}, ${priceLabel(product)}. View and purchase`);
    price.onclick = () => imageButton.click();
    sale.append(price);
    imageButton.setAttribute("aria-label", `View and purchase ${title}`);
  } else {
    sale.textContent = isEdition(product) ? "SOLD OUT" : "SOLD";
    imageButton.setAttribute("aria-label", `Enlarge ${title}`);
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
  if (current) openPiece(current.piece);
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
      if (!findVariant(product, current.selection)?.availableForSale) current.selection = initialSelection(product);
      renderPanel();
    }
  } catch (_) {
    // Keep the last known state; Shopify still validates at cart and checkout.
  }
}

await loadProducts();

/* Shared links such as /paintings/#red-sea open that work. */
const linked = location.hash && pieceFor(decodeURIComponent(location.hash.slice(1)));
if (linked) linked.querySelector(".image-button").click();
