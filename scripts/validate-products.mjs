import fs from "node:fs";
import path from "node:path";

const productsPath = path.resolve("src/_data/products.json");

function fail(message) {
  console.error(`products validation failed: ${message}`);
  process.exit(1);
}

function assertNonEmptyString(item, key, index) {
  if (typeof item[key] !== "string" || item[key].trim() === "") {
    fail(`item ${index} is missing required non-empty string field \"${key}\"`);
  }
}

let raw;
try {
  raw = fs.readFileSync(productsPath, "utf8");
} catch (error) {
  fail(`could not read ${productsPath}: ${error.message}`);
}

let products;
try {
  products = JSON.parse(raw);
} catch (error) {
  fail(`invalid JSON in ${productsPath}: ${error.message}`);
}

if (!Array.isArray(products)) {
  fail("products.json must be an array");
}

if (products.length === 0) {
  fail("products.json must contain at least one product");
}

const requiredStringFields = [
  "slug",
  "name",
  "price",
  "shopifyProductId",
  "shopifyProductNodeId",
  "shopifyLoaderId",
];

const uniqueFields = ["slug", "shopifyProductId", "shopifyProductNodeId", "shopifyLoaderId"];
const seenValues = Object.fromEntries(uniqueFields.map((field) => [field, new Set()]));

products.forEach((item, index) => {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    fail(`item ${index} must be an object`);
  }

  for (const field of requiredStringFields) {
    assertNonEmptyString(item, field, index);
  }

  if (typeof item.isShirt !== "boolean") {
    fail(`item ${index} must include boolean field \"isShirt\"`);
  }

  for (const field of uniqueFields) {
    const value = item[field].trim();
    if (seenValues[field].has(value)) {
      fail(`duplicate value for \"${field}\": ${value}`);
    }
    seenValues[field].add(value);
  }
});

console.log(`products validation passed: ${products.length} item(s)`);