/* eslint-disable no-console -- CLI script */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderSeedSql } from "../src/sql";

const target = fileURLToPath(
  new URL("../../../supabase/migrations/20261028020000_seed_content.sql", import.meta.url),
);
writeFileSync(target, renderSeedSql());
console.log(`Wrote ${target}`);
