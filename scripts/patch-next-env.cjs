#!/usr/bin/env node
/**
 * Node 24+ ESM interop: named imports from @next/env fail unless CJS re-exports are explicit.
 * Idempotent — safe to run on every install.
 */
const fs = require("fs");
const path = require("path");

const target = path.join(
  __dirname,
  "..",
  "node_modules",
  "@next",
  "env",
  "dist",
  "index.js",
);

const marker = "NODE_ESM_NAMED_EXPORTS";

function main() {
  if (!fs.existsSync(target)) {
    return;
  }
  const src = fs.readFileSync(target, "utf8");
  if (src.includes(marker)) {
    return;
  }
  const patch = `
;(()=>{const m=module.exports;if(m&&typeof m==="object"){exports.loadEnvConfig=m.loadEnvConfig;exports.initialEnv=m.initialEnv;exports.updateInitialEnv=m.updateInitialEnv;exports.processEnv=m.processEnv;exports.resetEnv=m.resetEnv}})();
// ${marker}
`;
  fs.writeFileSync(target, src + patch);
  console.info("[autoYT] Patched @next/env for Node 24+ ESM named exports.");
}

main();
