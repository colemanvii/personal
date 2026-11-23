// Every folder in src/work/ is one work: an index.md (front matter + optional
// description) and its images. A work with media gets its own page at
// /work/<folder-name>/. A work with only an external link is listed on the
// index and links straight out. `draft: true` hides a work from the built site.
export default {
  layout: "work.njk",
  eleventyComputed: {
    permalink: data => {
      if (data.draft && !data.showDrafts) return false;
      if (!data.media?.length) return false;
      return `/work/${data.page.fileSlug}/`;
    },
  },
};
