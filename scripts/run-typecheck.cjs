#!/usr/bin/env node
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const outFile = path.join(root, "typecheck-output.txt");

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    status: r.status,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

const lines = [];
lines.push("=== npx tsc --noEmit ===");
const tsc = run("npx", ["tsc", "--noEmit"]);
lines.push(tsc.stdout);
if (tsc.stderr) lines.push(tsc.stderr);
lines.push(`exit: ${tsc.status}`);

lines.push("\n=== npm run build ===");
const build = run("npm", ["run", "build"]);
lines.push(build.stdout);
if (build.stderr) lines.push(build.stderr);
lines.push(`exit: ${build.status}`);

fs.writeFileSync(outFile, lines.join("\n"), "utf8");
console.log(`Wrote ${outFile}`);
