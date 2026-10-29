/* eslint-disable no-console -- CLI script */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderLessonsSql, renderRunGuidesSql, renderSeedSql } from "../src/sql";

const migration = (name: string) =>
  fileURLToPath(new URL(`../../../supabase/migrations/${name}`, import.meta.url));

const outputs: [string, string][] = [
  [migration("20261028020000_seed_content.sql"), renderSeedSql()],
  [migration("20261028050000_seed_lessons.sql"), renderLessonsSql()],
  [migration("20261029010000_seed_run_guides.sql"), renderRunGuidesSql()],
];
for (const [target, sql] of outputs) {
  writeFileSync(target, sql);
  console.log(`Wrote ${target}`);
}
