# Painting crop study

Non-destructive crops for the two-column iPhone gallery. Nothing here
changes a photograph: Shopify's CDN crops each original on request
(`crop=region&crop_left=…&crop_top=…&crop_width=…&crop_height=…`), and the
originals on Shopify stay as they are. The enlarged viewer keeps using the
uncropped photographs.

- `canvases.json`: where each painted canvas sits in its photograph,
  read by eye against a 5% grid, with notes on anything covering it.
- `plan.py`: turns those into 4:5 crop regions in source pixels that keep
  the whole canvas plus a margin of 10% of its larger side; never larger
  than the photograph, never upscaled; proposes no crop under 15% gain.
- `crops.json`: the proposed regions (output of `plan.py`).

Applied provisionally (26 Oct 2026) to the iPhone gallery thumbnails only:

- `approved.json`: which crops are used (11) and which are held at their
  original framing (Peach Circuit, Red Sea, Flowers in McCarty Vase), with
  reasons.
- `apply.py`: writes approved crops into `paintings/index.html` as an
  iPhone-only `<source>` beside the untouched original. To revert a crop,
  move its handle to `held` and run
  `python3 studies/painting-crops/apply.py paintings/index.html`.

Desktop and the enlarged viewer always use the original photographs.

Checked on 26 Oct 2026: Shopify's crops match a local crop of each original
to within JPEG noise (mean difference 0.4/255 or less), and crops smaller
than the requested width are returned at their own size, not upscaled.
