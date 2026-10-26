/* The paintings viewer: one work at a time, with its wall label.
 *
 * Owns opening, closing and moving between works (buttons, arrow keys,
 * swipe). Anything that adds to a work's label, such as purchasing, listens
 * for "painting:show" and reads the piece from the event. */

const pieces = [...document.querySelectorAll(".gallery .piece")];
const dialog = document.getElementById("painting-detail");
const image = document.getElementById("detail-image");
const art = dialog.querySelector(".full-art");
const scroller = dialog.querySelector(".full");
const prev = document.getElementById("detail-prev");
const next = document.getElementById("detail-next");
let index = -1;

/* Shopify's image CDN resizes on request. */
function sized(url, width) {
  const u = new URL(url, location.href);
  u.searchParams.set("width", String(width));
  return u.href;
}

export function setImage(url, alt) {
  image.src = sized(url, 1600);
  image.srcset = [800, 1200, 1600, 2400].map(w => `${sized(url, w)} ${w}w`).join(", ");
  image.sizes = "(max-width: 700px) 100vw, 66vw";
  if (alt != null) image.alt = alt;
}

export const titleOf = piece => piece.querySelector(".caption h2").textContent;
export const detailsOf = piece => piece.querySelector(".caption p")?.textContent || "";
export const numberOf = piece => String(pieces.indexOf(piece) + 1).padStart(2, "0");

function show(i) {
  index = (i + pieces.length) % pieces.length;
  const piece = pieces[index];
  const source = piece.querySelector(".image-button img");
  setImage(source.currentSrc || source.src, source.alt);
  document.getElementById("detail-name").textContent = titleOf(piece);
  document.getElementById("detail-info").textContent = detailsOf(piece);
  document.getElementById("detail-number").textContent = `${numberOf(piece)} / ${String(pieces.length).padStart(2, "0")}`;
  document.getElementById("detail-state").replaceChildren();
  scroller.scrollTop = 0;
  if (!dialog.open) dialog.showModal();
  history.replaceState(null, "", `#${piece.id}`);
  dialog.dispatchEvent(new CustomEvent("painting:show", {detail: {piece, index}}));
  // Warm the neighbours so moving between works feels immediate.
  for (const n of [index - 1, index + 1]) {
    const img = pieces[(n + pieces.length) % pieces.length].querySelector(".image-button img");
    new Image().src = sized(img.src, 1200);
  }
}

pieces.forEach((piece, i) => piece.querySelector(".image-button").addEventListener("click", () => show(i)));
prev.addEventListener("click", () => show(index - 1));
next.addEventListener("click", () => show(index + 1));
document.getElementById("detail-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener("close", () => {
  history.replaceState(null, "", location.pathname + location.search);
  pieces[index]?.querySelector(".image-button").focus({preventScroll: true});
  index = -1;
});
dialog.addEventListener("keydown", event => {
  if (event.target.closest("input, select, textarea")) return;
  if (event.key === "ArrowLeft") show(index - 1);
  if (event.key === "ArrowRight") show(index + 1);
});

/* A horizontal swipe across the painting moves between works; pinching is left to the browser. */
let touch = null;
art.addEventListener("touchstart", event => {
  touch = event.touches.length === 1 ? {x: event.touches[0].clientX, y: event.touches[0].clientY} : null;
}, {passive: true});
art.addEventListener("touchend", event => {
  if (!touch || event.touches.length) return;
  const dx = event.changedTouches[0].clientX - touch.x;
  const dy = event.changedTouches[0].clientY - touch.y;
  touch = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1));
}, {passive: true});

export function openByHandle(handle) {
  const i = pieces.findIndex(p => p.id === handle);
  if (i >= 0) show(i);
}

/* The work on show, for modules that start listening after it opened. */
export const currentPiece = () => (dialog.open && index >= 0 ? pieces[index] : null);

/* Shared links such as /paintings/#red-sea open that work. */
if (location.hash) openByHandle(decodeURIComponent(location.hash.slice(1)));
