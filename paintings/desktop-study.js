/* Comparison study only: /paintings/?cols=4 shows the four-column desktop collection. */
if (new URLSearchParams(location.search).get("cols") === "4") document.documentElement.dataset.cols = "4";
