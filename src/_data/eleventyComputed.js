import path from "node:path";
import { ogCard } from "../../lib/images.js";
import { leadImage } from "../../lib/media.js";

// Every page's Open Graph image: a work's lead image, or the file a page names
// in `ogSource`, set whole on the media ground at 1200 × 630.
export default {
  ogImage: async data => {
    if (!data.page?.inputPath || data.permalink === false) return null;
    const src = leadImage(data.media) || data.ogSource;
    if (!src) return null;
    const file = path.join(path.dirname(data.page.inputPath), src);
    return data.site.url + (await ogCard(file, data.page.fileSlug || "home"));
  },
};
