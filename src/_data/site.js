// Site-wide settings. Edit these, then run `npm run build`.
export default {
  name: "Cole Calfee",
  url: "https://colecalfee.com",
  description: "Cole Calfee: creative direction, identity, web, film, editorial and music.",
  email: "colecalfee@gmail.com",
  instagram: { handle: "@colecalfee", url: "https://www.instagram.com/colecalfee/" },
  location: "Nashville, Tennessee / North Georgia",
  // The order of the discipline filter on the index.
  disciplines: ["Direction", "Identity", "Web", "Film", "Editorial", "Music", "Illustration", "Photography", "Painting"],
  // The two colourways. "paper" is the default; a visitor's choice is kept in
  // localStorage under "colorway". Every colour on the site is one of these four.
  colorways: {
    paper: { label: "Ink on paper", bg: "#f8f8f6", fg: "#171717" },
    // PROVISIONAL: to be sampled from the reference painting.
    earth: { label: "Chalk on brown", bg: "#3a281f", fg: "#efe8da" },
  },
  // Cloudflare Web Analytics site token. Leave empty for no analytics.
  analyticsToken: "",
};
