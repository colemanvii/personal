/* Art-direction studies for the iPhone gallery: /paintings/?study=1, 2 or 3.
 * Without the parameter the page is unchanged. Studies change presentation
 * only; the viewer and purchasing behave exactly as on the plain page.
 *
 * Each work's physical size is read from its wall label ("36 × 48 in.") so
 * scale can follow the paintings themselves rather than arbitrary choices. */
const study = new URLSearchParams(location.search).get("study");
if (["1", "2", "3"].includes(study)) {
  document.documentElement.dataset.study = study;
  for (const piece of document.querySelectorAll(".gallery .piece")) {
    const size = piece.querySelector(".caption p")?.textContent.match(/(\d+)\s*×\s*(\d+)/);
    if (!size) continue;
    const longest = Math.max(Number(size[1]), Number(size[2]));
    piece.style.setProperty("--longest", longest);
    if (longest >= 36) piece.dataset.featured = "";
  }
}
