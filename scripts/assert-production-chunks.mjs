import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const assetsDir = resolve(process.cwd(), "dist/public/assets");
const files = readdirSync(assetsDir);
const requiredPrefixes = ["Platform-", "AssessmentEnhancers-", "react-core-", "data-client-"];
const missing = requiredPrefixes.filter(prefix => !files.some(file => file.startsWith(prefix) && file.endsWith(".js")));

if (missing.length) {
  throw new Error(`Production chunk regression: missing expected chunks: ${missing.join(", ")}`);
}

console.log("Production chunk check passed:", requiredPrefixes.join(", "));
