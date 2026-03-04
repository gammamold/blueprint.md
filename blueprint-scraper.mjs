#!/usr/bin/env node

/**
 * BLUEPRINT.MD — GitHub Scraper
 * 
 * Searches GitHub for .md files that look like buildable specs,
 * classifies them with Claude, and saves matches as importable JSON.
 *
 * Setup:
 *   npm install node-fetch dotenv
 * 
 * .env file:
 *   GITHUB_TOKEN=your_github_personal_access_token
 *   ANTHROPIC_API_KEY=your_anthropic_api_key
 *
 * Run:
 *   node blueprint-scraper.js
 *   node blueprint-scraper.js --query "VST plugin spec" --max 50
 */

import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!GITHUB_TOKEN || !ANTHROPIC_KEY) {
  console.error("❌  Missing env vars. Create a .env file with GITHUB_TOKEN and ANTHROPIC_API_KEY.");
  process.exit(1);
}

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};

const CONFIG = {
  maxResults:  parseInt(getArg("--max", "30")),
  outputFile:  getArg("--out", "scraped-blueprints.json"),
  delayMs:     800,   // delay between Claude calls to avoid rate limits
  minFileSize: 300,   // bytes — skip tiny files
  maxFileSize: 50000, // bytes — skip giant files
};

// Search queries — tuned to find actual build specs, not READMEs
const SEARCH_QUERIES = [
  // Audio / VST
  "VST plugin specification JUCE extension:md",
  "audio synthesizer blueprint specification extension:md",
  "plugin spec architecture components extension:md",
  "audio effect plugin specification parameters extension:md",
  "MIDI controller plugin blueprint specification extension:md",

  // Web / React apps
  "react app blueprint specification features extension:md",
  "app blueprint requirements features extension:md",
  "web app specification tech stack components extension:md",
  "SPA specification features architecture extension:md",
  "dashboard app blueprint specification extension:md",

  // Tools / CLIs
  "CLI tool specification build extension:md",
  "software specification build features tech stack extension:md",
  "developer tool blueprint specification extension:md",

  // Games
  "game design document specification extension:md",
  "browser game blueprint specification features extension:md",

  // Mobile
  "mobile app blueprint requirements extension:md",
  "android app specification features extension:md",

  // Bots / Extensions
  "discord bot specification features extension:md",
  "chrome extension specification features extension:md",
  "browser extension blueprint specification extension:md",

  // APIs / Backend
  "API design specification endpoints extension:md",
  "REST API blueprint specification extension:md",

  // UI
  "UI component library specification extension:md",
  "design system blueprint specification extension:md",
];

// ─── GITHUB API ───────────────────────────────────────────────────────────────

async function searchGitHub(query, perPage = 10) {
  const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=${perPage}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (res.status === 403) throw new Error("GitHub rate limit hit. Wait 60s and retry.");
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const data = await res.json();
  return data.items || [];
}

async function fetchFileContent(item) {
  // Use raw content URL
  const rawUrl = item.html_url
    .replace("github.com", "raw.githubusercontent.com")
    .replace("/blob/", "/");

  const res = await fetch(rawUrl, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
  });

  if (!res.ok) return null;
  return res.text();
}

function getRepoInfo(item) {
  return {
    repo:    item.repository?.full_name || "unknown",
    repoUrl: item.repository?.html_url || "",
    fileUrl: item.html_url,
    license: item.repository?.license?.spdx_id || "unknown",
    stars:   item.repository?.stargazers_count || 0,
  };
}

// ─── CLAUDE CLASSIFICATION ────────────────────────────────────────────────────

async function classifyWithClaude(mdContent, repoInfo) {
  const prompt = `You are classifying .md files for a blueprint marketplace.

A valid blueprint is a .md spec file that an LLM can use to build working software — a VST plugin, app, UI component, game, or script. It should describe WHAT to build, not document existing code.

Analyze this file and return ONLY valid JSON, no markdown fences:

{
  "is_blueprint": true or false,
  "confidence": 0-100,
  "category": "VST" | "App" | "UI" | "Game" | "Script" | "Other",
  "title": "inferred short title",
  "description": "one sentence description of what it builds",
  "tags": ["tag1", "tag2", "tag3"],
  "tech_stack": ["technology1", "technology2"],
  "completeness": 0-100,
  "reason": "brief explanation of your decision"
}

Only mark is_blueprint=true if this file is clearly a buildable specification, not a README, changelog, documentation, or tutorial.

File from: ${repoInfo.repo}

Content:
${mdContent.slice(0, 3000)}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001", // use Haiku for cost efficiency on bulk classification
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function dedupe(items) {
  const seen = new Set();
  return items.filter(item => {
    if (seen.has(item.sha)) return false;
    seen.add(item.sha);
    return true;
  });
}

function isPermissiveLicense(license) {
  const permissive = ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "CC0-1.0", "Unlicense", "WTFPL"];
  return permissive.includes(license) || license === "unknown"; // unknown = assume ok, check manually
}

// ─── PROGRESS DISPLAY ─────────────────────────────────────────────────────────

function log(icon, msg, detail = "") {
  const d = detail ? ` \x1b[2m${detail}\x1b[0m` : "";
  console.log(`${icon}  ${msg}${d}`);
}

function printSummary(results) {
  console.log("\n" + "─".repeat(60));
  console.log(`\x1b[1m📊 SCRAPE SUMMARY\x1b[0m`);
  console.log("─".repeat(60));
  console.log(`Total candidates scanned:  ${results.scanned}`);
  console.log(`Classified as blueprints:  \x1b[32m${results.blueprints.length}\x1b[0m`);
  console.log(`Rejected (not a spec):     ${results.rejected}`);
  console.log(`Skipped (license/size):    ${results.skipped}`);
  console.log(`Errors:                    \x1b[31m${results.errors}\x1b[0m`);
  console.log("─".repeat(60));

  if (results.blueprints.length > 0) {
    console.log("\n\x1b[1mFound blueprints:\x1b[0m");
    results.blueprints.forEach((bp, i) => {
      console.log(`\n  ${i + 1}. \x1b[33m${bp.title}\x1b[0m [${bp.category}] (${bp.completeness}% complete)`);
      console.log(`     ${bp.description}`);
      console.log(`     \x1b[2m${bp.source.repo} · ${bp.tags.join(", ")}\x1b[0m`);
    });
  }

  console.log(`\n\x1b[32m✓ Saved to ${CONFIG.outputFile}\x1b[0m\n`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n\x1b[1m🔍 BLUEPRINT.MD SCRAPER\x1b[0m");
  console.log("Searching GitHub for buildable .md specs...\n");

  const results = { scanned: 0, blueprints: [], rejected: 0, skipped: 0, errors: 0 };
  const seen = new Set(); // track by file URL to avoid dupes across queries

  for (const query of SEARCH_QUERIES) {
    if (results.blueprints.length >= CONFIG.maxResults) break;

    log("🔎", `Query: "${query}"`);

    let items;
    try {
      items = await searchGitHub(query, 15);
      await sleep(1000); // respect GitHub rate limits
    } catch (e) {
      log("⚠️", `Search failed: ${e.message}`);
      continue;
    }

    items = dedupe(items).filter(item => !seen.has(item.html_url));

    for (const item of items) {
      if (results.blueprints.length >= CONFIG.maxResults) break;
      seen.add(item.html_url);
      results.scanned++;

      const repoInfo = getRepoInfo(item);

      // Skip non-permissive licenses
      if (!isPermissiveLicense(repoInfo.license)) {
        log("⛔", `Skipped — restrictive license (${repoInfo.license})`, repoInfo.repo);
        results.skipped++;
        continue;
      }

      // Fetch content
      let content;
      try {
        content = await fetchFileContent(item);
      } catch (e) {
        results.errors++;
        continue;
      }

      if (!content) { results.skipped++; continue; }

      // Skip if too small or too large
      const size = Buffer.byteLength(content, "utf8");
      if (size < CONFIG.minFileSize || size > CONFIG.maxFileSize) {
        results.skipped++;
        continue;
      }

      // Classify with Claude
      log("🤖", `Classifying...`, repoInfo.repo + " / " + item.name);
      let classification;
      try {
        classification = await classifyWithClaude(content, repoInfo);
        await sleep(CONFIG.delayMs);
      } catch (e) {
        log("❌", `Claude error: ${e.message}`);
        results.errors++;
        continue;
      }

      if (!classification.is_blueprint || classification.confidence < 70) {
        log("✗", `Not a blueprint (${classification.confidence}% confidence)`, classification.reason);
        results.rejected++;
        continue;
      }

      // It's a blueprint — save it
      const blueprint = {
        id:           `scraped_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        title:        classification.title,
        category:     classification.category,
        description:  classification.description,
        tags:         classification.tags,
        tech_stack:   classification.tech_stack,
        completeness: classification.completeness,
        confidence:   classification.confidence,
        content:      content,
        source: {
          ...repoInfo,
          filename: item.name,
          scraped_at: new Date().toISOString(),
          attribution: `Sourced from ${repoInfo.repo} on GitHub`,
        },
        status: "pending_review", // imported blueprints need human review before going live
      };

      results.blueprints.push(blueprint);
      log("✅", `\x1b[32mBLUEPRINT FOUND\x1b[0m: ${classification.title}`, `[${classification.category}] ${classification.completeness}% complete`);
    }
  }

  // Save results
  const output = {
    scraped_at: new Date().toISOString(),
    total: results.blueprints.length,
    blueprints: results.blueprints,
  };

  fs.writeFileSync(CONFIG.outputFile, JSON.stringify(output, null, 2));
  printSummary(results);
}

main().catch(e => {
  console.error("\n❌ Fatal error:", e.message);
  process.exit(1);
});
