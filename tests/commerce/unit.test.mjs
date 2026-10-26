// Run: node --test tests/commerce/unit.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {formatMoney, choiceOptions, findVariant, initialSelection, valueAvailable, isEdition, priceLabel, sizedImage} from "../../assets/js/storefront.js";

const usd = amount => ({amount, currencyCode: "USD"});
const variant = (id, options, price, availableForSale = true) => ({
  id, availableForSale, price: usd(price), title: Object.values(options).join(" / "), image: null,
  selectedOptions: Object.entries(options).map(([name, value]) => ({name, value}))
});

// Shape of a real single-variant original, as Shopify returns it today.
const original = {
  handle: "red-sea", tags: [], productType: "",
  options: [{name: "Title", optionValues: [{name: "Default Title"}]}],
  selectedOrFirstAvailableVariant: {id: "v1"},
  variants: {nodes: [variant("v1", {Title: "Default Title"}, "2400.0")]}
};

// A future print edition with two options and one sold-out combination.
const print = {
  handle: "red-sea-print", tags: ["edition"], productType: "",
  options: [
    {name: "Size", optionValues: [{name: "8 × 10 in."}, {name: "16 × 20 in."}]},
    {name: "Framing", optionValues: [{name: "Unframed"}, {name: "Framed"}]}
  ],
  selectedOrFirstAvailableVariant: {id: "p2"},
  variants: {nodes: [
    variant("p1", {Size: "8 × 10 in.", Framing: "Unframed"}, "125.0", false),
    variant("p2", {Size: "8 × 10 in.", Framing: "Framed"}, "225.0"),
    variant("p3", {Size: "16 × 20 in.", Framing: "Unframed"}, "275.0"),
    variant("p4", {Size: "16 × 20 in.", Framing: "Framed"}, "395.0")
  ]}
};

test("formats Shopify money without needless cents", () => {
  assert.equal(formatMoney(usd("2400.0")), "$2,400");
  assert.equal(formatMoney(usd("125.5")), "$125.50");
  assert.equal(formatMoney(null), "");
});

test("hides Shopify's Default Title placeholder but keeps real options", () => {
  assert.deepEqual(choiceOptions(original), []);
  assert.deepEqual(choiceOptions(print).map(o => o.name), ["Size", "Framing"]);
});

test("starts from Shopify's selected-or-first-available variant", () => {
  assert.deepEqual(initialSelection(original), {Title: "Default Title"});
  assert.deepEqual(initialSelection(print), {Size: "8 × 10 in.", Framing: "Framed"});
});

test("matches a variant from selected options", () => {
  assert.equal(findVariant(print, {Size: "16 × 20 in.", Framing: "Framed"}).id, "p4");
  assert.equal(findVariant(print, {Size: "16 × 20 in."}), null);
});

test("marks option values that cannot lead to an available variant", () => {
  const selection = {Size: "8 × 10 in.", Framing: "Framed"};
  assert.equal(valueAvailable(print, selection, "Framing", "Unframed"), false);
  assert.equal(valueAvailable(print, selection, "Size", "16 × 20 in."), true);
});

test("treats only tagged or typed products as editions", () => {
  assert.equal(isEdition(original), false);
  assert.equal(isEdition(print), true);
  assert.equal(isEdition({tags: [], productType: "Art Print"}), true);
  assert.equal(isEdition({tags: ["Prints "], productType: ""}), true);
});

test("labels varying prices from the lowest available variant", () => {
  assert.equal(priceLabel(original), "$2,400");
  assert.equal(priceLabel(print), "From $225");
  assert.equal(priceLabel({variants: {nodes: [variant("x", {}, "10.0", false)]}}), "");
});

test("asks Shopify's CDN for a sized image", () => {
  assert.equal(sizedImage("https://cdn.shopify.com/a.jpg?v=1", 400), "https://cdn.shopify.com/a.jpg?v=1&width=400");
  assert.equal(sizedImage("not a url", 400), "not a url");
});
