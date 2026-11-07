# Survey of existing Opepen sets — status: INCOMPLETE (blocked)

**Read this first.** The brief asks us to inspect the actual artwork of 10–15 sets. This
has *not* been done yet, and nothing below should be read as if it had. The cloud
environment this research ran in blocks `opepen.art` and `api.opepen.art` at the network
level, so no artwork could be fetched or looked at. I will not substitute descriptions
from memory for looking. What follows is (1) the facts I could confirm, (2) hypotheses
to test, and (3) a ready protocol to finish the survey the moment the domains are
allowed.

## 1. Confirmed facts (web search of the indexed opepen.art pages, 2026-11-07)

| Set | Name | Artist (where the source names one) | Source |
|---|---|---|---|
| 001 | 8x8 | Jack Butcher | opepen.art/sets; secondary explainers |
| 002 | Brought to Light | — | opepen.art/sets |
| 006 | — | PIV | secondary explainer; [OpenSea interview with PIV](https://opensea.io/blog/articles/in-conversation-with-piv) |
| 010 | 1/0 | — | opepen.art/sets |
| 011 | Opepengs | (Pudgy Penguins collaboration) | opepen.art/sets; DappRadar |
| 020 | Synopepen | — | opepen.art/sets |
| 023 | — | Jhekub | secondary explainer |
| 036 | APEPEN | — | opepen.art/sets |
| 049 | — | Jack Butcher | [opepen.art/timeline](https://opepen.art/timeline) |
| 062 | Alpha | SHL0MS | opepen.art/timeline |
| 063 | — | Ars0nic | opepen.art/timeline |
| 069 | OPEPEN SECRET | Visualize Value | opepen.art/timeline |
| 081 | Economy of Opepen | — | opepen.art/sets |
| 083 | 11x11 | — | opepen.art/sets |

The indexed sets page reported 84 sets complete of 200 (index date unknown; check live).
The homepage's featured artists include Snowfro, alphacentaurikid, Jack Butcher,
Visualize Value, PIV, batz and Derrick Kempf. PIV's interview describes *Cropped Punks*,
80 crops of CryptoPunks in the Opepen format, and PIV's later move into oil painting
from those digital crops — the closest documented precedent I found for a
physical-medium practice entering the Opepen orbit (in the opposite direction to ours).

## 2. Hypotheses to test by looking

From set names alone, three families seem to dominate the permanent collection. These are
guesses until the art is inspected:

1. **Self-reference** — work about Opepen's own grid, numbers and economy
   (*8x8*, *11x11*, *1/0*, *Economy of Opepen*, *OPEPEN SECRET*).
2. **Crypto-native crossover** — the silhouette dressed as other on-chain IP
   (*Opepengs*, *APEPEN*, *Cropped Punks*).
3. **Digital systems** — generative, synthetic, pixel or code-driven
   (*Synopepen*, grid resolutions).

If that holds, what is *under*-represented is: sustained observational drawing; work with
a physical original and a provenance chain; subjects from outside crypto culture; sets
where the 80 tokens are a sequence with an internal logic rather than 80 colourways.
That is the territory SECTION LINE is aimed at. **If the inspection shows a strong
hand-drawn or landscape set already exists, we change course before drawing anything.**

What I expect to call overused once verified (stated now so it can be checked, not
assumed): palette swaps as the whole idea; filling the silhouette with an image
(a mask); dressing it as a character; glitch/noise treatments; 80 near-identical
variants that differ only by seed.

## 3. Protocol to finish the survey (≈2 hours once unblocked)

1. Allow `opepen.art` and `api.opepen.art` in the environment's network settings.
2. `node tools/fetch-opepen-reference.mjs` → `research/reference/opepen-reference.jsonl`
   (public GETs only, as documented in the directive).
3. Pull the six-piece square contact sheet for each shortlisted set
   (`GET /render/sets/{uuid}/square`) and, for dynamic sets, the variant previews.
4. Shortlist (15): the 14 sets above + the three most-demanded current **DYNAMIC**
   candidates (`filter[edition_type]=DYNAMIC`) + any candidate whose description mentions
   drawing, ink, paper, painting, landscape or Western subjects.
5. For each, fill one row: visual idea · relationship to silhouette · material/process ·
   how the six groups differ · how the 80 variants differ · what I'd steal (principle,
   never form) · what to avoid.
6. Re-score SECTION LINE against that sheet before Cole draws the first final piece.
