#!/usr/bin/env node
/**
 * Run Next.js CLI with Node 22 when the active Node is newer than supported (see .nvmrc).
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const major = Number(process.versions.node.split(".")[0]);

const node22Candidates = [
  process.env.UPGRADE_LIFE_NODE,
  "/opt/homebrew/opt/node@22/bin/node",
  "/usr/local/opt/node@22/bin/node",
].filter(Boolean);

function findNode22() {
  if (major === 22) {
    return process.execPath;
  }
  for (const candidate of node22Candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

const nodeBin = findNode22();
if (!nodeBin && major >= 25) {
  console.error(
    `[autoYT] Node ${process.version} is not supported for Next.js dev.\n` +
      "Install Node 22 LTS, then retry:\n" +
      "  brew install node@22\n" +
      "  brew link --overwrite --force node@22\n" +
      "Or set UPGRADE_LIFE_NODE to your Node 22 binary.",
  );
  process.exit(1);
}

const args = process.argv.slice(2);

// Prepare optimized, high-performance execution environment
const customEnv = {
  ...process.env,
  // 1. Bypass macOS local IPv6 lookup timeouts (ensures instantaneous API compilation)
  NODE_OPTIONS: "--dns-result-order=ipv4first",
  // 2. Disable telemetry to prevent startup and hot-reload network hangs
  NEXT_TELEMETRY_DISABLED: "1"
};

if (nodeBin) {
  customEnv.NODE_BINARY = nodeBin;
  // 3. Force Node 22 to be the primary interpreter by prepending its directory to PATH
  const nodeDir = path.dirname(nodeBin);
  customEnv.PATH = `${nodeDir}${path.delimiter}${process.env.PATH || ""}`;
}

// Execute Next.js via npm exec
const result = spawnSync(
  "npm",
  ["exec", "next", "--", ...args],
  {
    stdio: "inherit",
    env: customEnv,
  },
);

process.exit(result.status ?? 1);
