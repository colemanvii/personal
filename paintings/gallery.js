/* The paintings viewer: one work at a time, with its wall label.
 *
 * The paintings sit side by side in a strip that scrolls and snaps natively,
 * so a swipe on iPhone moves the next work in under the finger. The label
 * follows whichever painting is centred. Buttons and arrow keys move one work
 * at a time. Anything that adds to a work's label, such as purchasing,
 * listens for "painting:show" and reads the piece from the event.
 *
 * The viewer follows the published page: Available Works first, then the
 * Selected Archive, each work with its own catalogue number. */

const pieces = [...document.querySelectorAll(".gallery .piece")];
const dialog = document.getElementById("painting-detail");
const track = dialog.querySelector(".viewer-track");
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

function source(img, url) {
  img.src = sized(url, 1600);
  img.srcset = [800, 1200, 1600, 2400].map(w => `${sized(url, w)} ${w}w`).join(", ");
  img.sizes = "(max-width: 700px) 100vw, 66vw";
}

/* Some works hang in the site's own photograph rather than Shopify's: its
   sizes are already in the gallery markup, up to the untouched original. */
const thumbOf = piece => piece.querySelector(".image-button img");
export const hasOwnPhoto = piece => !/^https?:/.test(thumbOf(piece).getAttribute("src"));

function photograph(img, piece) {
  const original = thumbOf(piece);
  if (!hasOwnPhoto(piece)) return source(img, original.getAttribute("src"));
  img.src = original.getAttribute("src");
  img.srcset = original.getAttribute("srcset");
  img.sizes = "(max-width: 700px) 100vw, 66vw";
}

export const titleOf = piece => piece.querySelector(".caption h3").textContent;
export const detailsOf = piece => piece.querySelector(".caption p")?.textContent || "";
export const numberOf = piece => piece.querySelector(".caption").dataset.number;

/* "Oil on canvas · 36 × 48 in." becomes a medium line and a size line with
   centimetres, as a monograph sets them. A year shows only when a work has
   one (data-year on its article); none is ever guessed. */
export function partsOf(piece) {
  const [medium, size = ""] = detailsOf(piece).split(" · ");
  const inches = size.match(/([\d.]+)\s*×\s*([\d.]+)\s*in\./);
  const cm = inches ? ` / ${(inches[1] * 2.54).toFixed(1)} × ${(inches[2] * 2.54).toFixed(1)} cm` : "";
  return {medium, size: size ? size + cm : "", year: piece.dataset.year || ""};
}

/* One slide per work; images load as they come near. */
const slides = pieces.map((piece, i) => {
  const original = thumbOf(piece);
  const slide = document.createElement("figure");
  slide.className = "viewer-slide";
  slide.setAttribute("role", "group");
  slide.setAttribute("aria-roledescription", "slide");
  slide.setAttribute("aria-label", `${i + 1} of ${pieces.length}`);
  const img = document.createElement("img");
  img.alt = original.alt;
  img.loading = "lazy";
  img.decoding = "async";
  photograph(img, piece);
  slide.append(img);
  track.append(slide);
  return slide;
});

/* Show another photograph of the work on show (a variant or another view);
   no url returns to the photograph it hangs in. */
export function setImage(url, alt) {
  const img = slides[index]?.querySelector("img");
  if (!img) return;
  if (url) source(img, url);
  else photograph(img, pieces[index]);
  if (alt != null) img.alt = alt;
}

function label(button, i, arrow) {
  const piece = pieces[i];
  button.hidden = !piece;
  if (!piece) return;
  button.textContent = arrow === "←" ? `← ${titleOf(piece)}` : `${titleOf(piece)} →`;
  button.setAttribute("aria-label", `${arrow === "←" ? "Previous" : "Next"}: ${titleOf(piece)}`);
}

/* Fill the label for the centred work and tell listeners. */
function present(i) {
  if (i === index) return;
  slides[index]?.querySelector("img")?.removeAttribute("id");
  index = i;
  const piece = pieces[i];
  slides[i].querySelector("img").id = "detail-image";
  document.getElementById("detail-name").textContent = titleOf(piece);
  const parts = partsOf(piece);
  document.getElementById("detail-medium").textContent = parts.medium;
  document.getElementById("detail-size").textContent = parts.size;
  const year = document.getElementById("detail-year");
  year.textContent = parts.year;
  year.hidden = !parts.year;
  document.getElementById("detail-number").textContent = `${numberOf(piece)} / ${String(pieces.length).padStart(2, "0")}`;
  document.getElementById("detail-state").replaceChildren();
  document.getElementById("detail-price").textContent = "";
  label(prev, i - 1, "←");
  label(next, i + 1, "→");
  slides.forEach((slide, n) => slide.setAttribute("aria-hidden", String(n !== i)));
  // The neighbours show at the edges and are a swipe away: load them now.
  for (const n of [i - 1, i + 1]) slides[n]?.querySelector("img").setAttribute("loading", "eager");
  history.replaceState(null, "", `#${piece.id}`);
  dialog.dispatchEvent(new CustomEvent("painting:show", {detail: {piece, index: i}}));
}

/* Move to a work without animation: buttons, keys and opening jump straight there. */
function go(i) {
  if (i < 0 || i >= pieces.length) return;
  if (!dialog.open) dialog.showModal();
  track.scrollTo({left: slides[i].offsetLeft - track.offsetLeft - (track.clientWidth - slides[i].clientWidth) / 2, behavior: "instant"});
  scroller.scrollTo({top: 0, behavior: "instant"});
  present(i);
}

/* A swipe: whichever slide is nearest the centre is the work on show. */
let settle;
track.addEventListener("scroll", () => {
  clearTimeout(settle);
  settle = setTimeout(() => {
    const centre = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    slides.forEach((slide, n) => {
      const mid = slide.offsetLeft - track.offsetLeft + slide.clientWidth / 2;
      const best = slides[nearest].offsetLeft - track.offsetLeft + slides[nearest].clientWidth / 2;
      if (Math.abs(mid - centre) < Math.abs(best - centre)) nearest = n;
    });
    if (dialog.open) present(nearest);
  }, 80);
}, {passive: true});

pieces.forEach(piece => piece.querySelector(".image-button").addEventListener("click", () => go(pieces.indexOf(piece))));
prev.addEventListener("click", () => go(index - 1));
next.addEventListener("click", () => go(index + 1));
document.getElementById("detail-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener("close", () => {
  history.replaceState(null, "", location.pathname + location.search);
  pieces[index]?.querySelector(".image-button").focus({preventScroll: true});
  index = -1;
});
/* Listen on the document: focus can leave the dialog when a step link hides at either end. */
document.addEventListener("keydown", event => {
  if (!dialog.open || event.target.closest("input, select, textarea")) return;
  if (event.key === "ArrowLeft") { event.preventDefault(); go(index - 1); }
  if (event.key === "ArrowRight") { event.preventDefault(); go(index + 1); }
});

/* The work on show, for modules that start listening after it opened. */
export const currentPiece = () => (dialog.open && index >= 0 ? pieces[index] : null);

export function openByHandle(handle) {
  const i = pieces.findIndex(p => p.id === handle);
  if (i >= 0) go(i);
}

/* Shared links such as /paintings/#red-sea open that work. */
if (location.hash) openByHandle(decodeURIComponent(location.hash.slice(1)));
