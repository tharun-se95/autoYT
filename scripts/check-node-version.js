#!/usr/bin/env node
/**
 * Enforce the minimum Node version Next.js 16 needs.
 * If you see odd `@edge-runtime` / `commander` crashes, try:
 *   rm -rf node_modules .next && npm install
 * Team default: Node 22 LTS (see `.nvmrc`).
 */
const [major, minor] = process.versions.node.split(".").map(Number);

if (major < 20 || (major === 20 && minor < 9)) {
  console.error(
    `[upgrade-life] Node ${process.version} is too old. Next.js 16 requires Node >= 20.9.`,
  );
  process.exit(1);
}

if (major >= 25) {
  console.warn(
    `[upgrade-life] Node ${process.version}: newer than our default CI target (see .nvmrc → 22). If \`next\` fails with @edge-runtime or empty compiled files, run: rm -rf node_modules .next && npm install`,
  );
}

process.exit(0);
