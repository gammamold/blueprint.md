# Blueprint Scraper

Searches GitHub for `.md` files that are buildable specs, classifies them with Claude, and exports them as JSON ready to import into the Blueprint.md marketplace.

## Setup

```bash
npm install node-fetch dotenv
```

Create a `.env` file:
```
GITHUB_TOKEN=your_github_personal_access_token
ANTHROPIC_API_KEY=your_anthropic_api_key
```

Get a GitHub token at: https://github.com/settings/tokens  
(only needs `public_repo` read scope)

## Run

```bash
# Default — runs all queries, max 30 results
node blueprint-scraper.js

# Custom
node blueprint-scraper.js --max 100 --out my-blueprints.json
```

## Output

Produces a `scraped-blueprints.json` file. Each blueprint has `status: "pending_review"` — imported blueprints should go through a human review step before going live on the platform.

## Cost

Uses Claude Haiku for bulk classification — roughly $0.002 per file scanned. 100 files ≈ $0.20.

## Notes

- Only pulls from permissive licenses (MIT, Apache, BSD, etc.)
- Skips files under 300 bytes or over 50KB
- Requires 70%+ confidence to classify as a blueprint
- Always attributes source repo
