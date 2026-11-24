# colecalfee.com: homepage design studies (November 2026)

Six homepage directions, built as working prototypes. This folder is a
development tool. It is outside `src/` and `site/`, so Eleventy never builds it
and Cloudflare Pages never publishes it. Production is unchanged.

Open `studies/index.html` through any static server to compare all six:

```
python3 -m http.server 8000 --directory studies   # then http://localhost:8000/
```

| | Study | Folder | Type | Field |
|---|---|---|---|---|
| A | Personal Address | `a/` | Helvetica | off-white `#f3f2ee` |
| B | Blue Hour | `b/` | Helvetica | slate blue `#56677f`, night `#2b3445` |
| C | Open Directory | `c/` | Helvetica, tabular figures | white |
| D | The Printed Page | `d/` | Georgia | paper `#f5f2eb`, rubric red `#9e2a1f` |
| E | Native Internet | `e/` | the browser's own | the browser's own (`Canvas`) |
| F | One Photograph | `f/` | Helvetica | `#f1f0ec` |

`screens/` holds a 1440×900 desktop render and an iPhone 15 render of each,
both at 2×. `reference/` holds the reference screenshot.

Each study is one HTML file with inline CSS. None uses a web font, a library
or JavaScript. F loads one WebP image (22–93 KB, depending on screen size).
Links point at `https://colecalfee.com/…` so they work from any preview. In
production they would become root-relative.

## The reference

* **Structure.** It is almost certainly a full-window table with two cells,
  each centered. The name's center lands at 25.1% of the width and the
  details' center at 76.5%. Both sit on the vertical midline (49.9%). The
  asymmetry is not drawn. It comes from one line of text facing a block of
  text, each centered in its half.
* **Scale.** The name is about twice the size of the details. Neither is
  large. The empty space carries the hierarchy, and the type carries the
  information.
* **Color.** The background samples at `#7d8999`, within screenshot error of
  the X11 color name `lightslategray` (`#778899`). Choosing a named color
  over a brand color is part of why it reads as indifferent rather than
  designed.
* **Links.** Default blue, default underline. They say "this is the web"
  without saying "this is retro". On that slate they measure **2.6:1**, which
  fails WCAG. The studies keep the attitude and fix the contrast. Every pair
  of colors in them is 4.5:1 or better.
* **No navigation.** The details table is the navigation: label, value. "gpg"
  in monospace is the only typographic exception, and it is functional.
* **Simple, not empty.** Nothing is missing. Every element answers a question
  a visitor actually has: who is this, how do I reach them, what have they
  made.

The session's network policy blocked outside sites, devin.com included, so
this analysis comes from the screenshot. It was not checked against the
site's source.

## Assessment

**A. Personal Address.** The closest to the reference, made more deliberate.
The name and the labelled index share one baseline, set at 44% of the height.
On the phone the layout becomes an envelope: the name sits where a sender
writes, and the index sits lower right, where the address goes. It is calm
and correct, and you could live with it for decades. The risk is that it is
*only* correct, a good reading of someone else's idea.

**B. Blue Hour.** Color as the subject. The words shrink to a wall label in
the lower left, which keeps every link within thumb reach on a phone. Dark
mode deepens the field to the blue after dusk. It is the most memorable at a
glance and the thinnest typographically. Everything rides on the color, and
colors drift between screens. A version that follows the visitor's local
time of day is possible, but I left it out as unnecessary.

**C. Open Directory.** The homepage is the index: all 23 existing works on
one screen, sorted into Work, Photographs, Music and Paintings, with years.
Correspondence sits beneath the name. It is the most useful study and the
most honest about what the archive is. It also scales least well. At roughly
40 works it will need a second level, which is the redesign this brief wants
to avoid.

**D. The Printed Page.** The desktop screen is an open book. The margins
follow the Van de Graaf canon: inner 1/9, outer 2/9, head 1/9, foot 2/9. The
title page sits on the right and the colophon on the left, and the
colophon's last line shares a baseline with the imprint. Red is used only
for what can be turned to, the links. On the phone, a single page. It is the
most composed and specific of the six, and Georgia, a typeface designed for
screens, keeps it off the nostalgia path. It leans literary, and the centered
axis is formal: closer to a monograph than to an address.

**E. Native Internet.** No typeface, size or color is chosen. The browser
supplies all of them, including dark mode and the purple of visited links.
Contact information sits in an `<address>`, which browsers set in italic by
default. The block is placed at the golden section. It is the purest idea and
the likeliest to look the same in 2046. To most visitors it will also look
unfinished. It works better as a rule for the other studies (native
elements, system colors, no web fonts) than as the homepage itself.

**F. One Photograph.** *Recommended.* One of your own photographs, hung
small: a truck crossing open ground at Teton Valley Ranch. The name hangs
from the picture's top edge and the index stands on its bottom edge, so the
eye moves diagonally across the screen. On the phone the order becomes a Z:
name, picture (set to the right), index. It is the only study that shows a
person rather than a page, and the picture is the one thing on the homepage
meant to change. You swap it by hand, rarely, the way someone changes what
hangs over a mantel. The photograph itself repeats the reference's idea: a
small mark in a large field.

## Recommendation

Develop **F**, and carry two things into it from the others:

* From **A**, the labelled index (`work / email / elsewhere`) in place of a
  bare list. Labels let the index grow for decades without changing the
  composition.
* From **E**, the discipline: system type, no web fonts, no JavaScript, and
  `color-scheme` set so the page has a real dark mode.

Second choice: **D**, if the site should read as a body of work more than as
an address.

## Unresolved decisions

1. **Tangerine.** The repository has no URL or content for it. No study
   links to it. It needs a URL before it can appear.
2. **Photographs as a destination.** There are six photography works, but no
   page gathers them; they exist as a filter on `/index/` that has no URL.
   A `/photographs/` page would make "Photographs" a real link.
3. **Writing and Music.** Neither exists as Cole's own work on the site
   today. Music appears only as release artwork, plus *Abbie Callahan —
   Linger*, credited as "Music". I left both out rather than adding empty
   doors.
4. **The truck photograph's date.** Its EXIF data says Canon EOS 6D, exported
   from Instagram in 2023. The other Teton Valley Ranch images were taken on
   a Nikon in 2015, and the work page captions all of them 2015. Confirm the
   year before the caption goes live.
5. **Freeman's place.** It is listed as a work (`/work/freeman-general-contracting/`)
   and as an "elsewhere" link to freemangc.com. Choose one role on the
   homepage.
6. **Existing inconsistency in production, not caused by these studies.** The
   header in `src/_includes/base.njk` links "Index" to `/`, which is now the
   minimal landing page. The index itself lives at `/index/`.
7. **Inner pages.** Every study changes only the homepage. Whichever direction
   is chosen, `/index/`, `/info/`, `/available/` and the work pages still use
   Geist Mono and the current system. They should follow, or the homepage
   will read as a different site.
8. **Fonts in these renders.** The screenshots were made on Linux, with
   Liberation Sans (Helvetica's metrics) and Gelasio (Georgia's metrics)
   standing in. Line breaks and widths match a Mac; letterforms will look
   better on yours.
