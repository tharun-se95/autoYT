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
  const node22 =
    process.env.UPGRADE_LIFE_NODE ||
    ["/opt/homebrew/opt/node@22/bin/node", "/usr/local/opt/node@22/bin/node"].find(
      (p) => {
        try {
          return require("fs").existsSync(p);
        } catch {
          return false;
        }
      },
    );
  if (node22) {
    console.warn(
      `[upgrade-life] Node ${process.version} detected; npm scripts will re-exec Next with Node 22 (${node22}).`,
    );
  } else {
    console.warn(
      `[upgrade-life] Node ${process.version} is newer than supported (see .nvmrc → 22).\n` +
        "Install Node 22 (e.g. brew install node@22) or set UPGRADE_LIFE_NODE.\n" +
        "If installs look corrupted: rm -rf node_modules .next && npm install",
    );
  }
}

process.exit(0);
