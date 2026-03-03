#!/usr/bin/env node
/**
 * import-scraped.mjs
 *
 * Reads scraped-blueprints.json (output of blueprint-scraper.mjs)
 * and inserts each blueprint into Supabase as status="pending" for admin review.
 *
 * Usage:
 *   node --env-file=scraper.env import-scraped.mjs
 *   node --env-file=scraper.env import-scraped.mjs --file my-output.json
 *
 * .env / scraper.env needs:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_KEY=...
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const args = process.argv.slice(2);
const getArg = (flag, def) => { const i = args.indexOf(flag); return i !== -1 && args[i+1] ? args[i+1] : def; };
const inputFile = getArg("--file", "scraped-blueprints.json");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in env.");
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`❌  File not found: ${inputFile}`);
  console.error("    Run blueprint-scraper.mjs first.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const raw = JSON.parse(fs.readFileSync(inputFile, "utf8"));
const blueprints = raw.blueprints || [];

if (blueprints.length === 0) {
  console.log("⚠️  No blueprints in file. Nothing to import.");
  process.exit(0);
}

console.log(`\n📦  Importing ${blueprints.length} scraped blueprints into Supabase...\n`);

let inserted = 0, skipped = 0, errors = 0;

for (const bp of blueprints) {
  // Check if already imported (by source URL)
  if (bp.source?.fileUrl) {
    const { data: existing } = await supabase
      .from("blueprints")
      .select("id")
      .eq("source_url", bp.source.fileUrl)
      .maybeSingle();
    if (existing) {
      console.log(`  ⟳  Already exists: ${bp.title}`);
      skipped++;
      continue;
    }
  }

  const record = {
    title:        bp.title,
    description:  bp.description,
    content:      bp.content,
    category:     bp.category,
    tags:         Array.isArray(bp.tags) ? bp.tags : [],
    tech_stack:   Array.isArray(bp.tech_stack) ? bp.tech_stack : [],
    completeness: bp.completeness || 0,
    is_scraped:   true,
    source_repo:  bp.source?.repo || null,
    source_url:   bp.source?.fileUrl || null,
    source_license: bp.source?.license || null,
    attribution:  bp.source?.attribution || null,
    status:       "pending",
    validation_passed: false,
  };

  const { error } = await supabase.from("blueprints").insert(record);

  if (error) {
    console.log(`  ❌  Failed: ${bp.title} — ${error.message}`);
    errors++;
  } else {
    console.log(`  ✅  Imported: ${bp.title} [${bp.category}]`);
    inserted++;
  }
}

console.log(`\n─────────────────────────────────`);
console.log(`  Imported: ${inserted}`);
console.log(`  Skipped (already in DB): ${skipped}`);
console.log(`  Errors: ${errors}`);
console.log(`\n✓ Done. Go to /admin/review to approve blueprints.\n`);
