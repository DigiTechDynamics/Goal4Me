// Keeps package.json "exports" in step with src/: every module (tests
// excluded) is importable as @goal4me/app-kit/<path without extension>.
// Modules with platform variants (purchases.ts + purchases.native.ts) stay
// internal: Metro skips platform extensions for "exports" targets, so an
// export would always load the web file. Import their consumers instead.
//
//   node scripts/exports.mjs          rewrite package.json
//   node scripts/exports.mjs --check  exit 1 if package.json is out of date (CI)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PLATFORM = /\.(native|ios|android|web)\.tsx?$/;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : walk(full);
    if (!/\.tsx?$/.test(entry.name) || PLATFORM.test(entry.name) || entry.name.endsWith(".d.ts"))
      return [];
    const base = full.replace(/\.tsx?$/, "");
    const hasVariant = [".native.ts", ".native.tsx"].some((ext) => fs.existsSync(base + ext));
    return hasVariant ? [] : [full];
  });
}

export function expectedExports() {
  const entries = walk(path.join(root, "src"))
    .map((file) => path.relative(root, file).split(path.sep).join("/"))
    .sort()
    .map((rel) => {
      const key = rel
        .replace(/^src\//, "./")
        .replace(/\.tsx?$/, "")
        .replace(/\/index$/, "");
      return [key, `./${rel}`];
    });
  return { "./package.json": "./package.json", ...Object.fromEntries(entries) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = path.join(root, "package.json");
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  const next = expectedExports();
  if (process.argv.includes("--check")) {
    if (JSON.stringify(pkg.exports) !== JSON.stringify(next)) {
      console.error(
        "@goal4me/app-kit exports are out of date: run pnpm --filter @goal4me/app-kit exports",
      );
      process.exit(1);
    }
  } else {
    pkg.exports = next;
    fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
  }
}
