# BLUEPRINT.MD — Project Roadmap

## ✅ Done

- [x] **Marketplace UI** — browse, filter by category, search, karma dots, tier badges
- [x] **Blueprint card** — shows title, description, tags, download/build counts, karma
- [x] **Build flow** — 3 access modes: own API key, contributor credits, pay-as-you-go
- [x] **Multi-LLM support** — Claude, Gemini, ChatGPT selectable per build
- [x] **Upload modal** — title, category, description, tags, .md file picker
- [x] **AI validation on upload** — Claude scans for security issues + quality/completeness before publish
- [x] **Validation report UI** — score bars, issue list, suggestions, pass/fail gate
- [x] **Contribution karma system** — upload earns karma + unlocks contributor build credits
- [x] **Buy me a coffee modal** — donation flow with supporter tier badge
- [x] **GitHub scraper** — searches GitHub API for .md blueprint specs, filters by license
- [x] **Claude classification** — Haiku classifies scraped files, 70%+ confidence threshold
- [x] **Import review panel** — table view, score bars, status filters, detail slide-in panel
- [x] **Editable metadata in review** — fix title/category/description/tags before approving
- [x] **Approve / reject / needs-edit actions** — batch publish approved blueprints
- [x] **Guided discovery UI** — Claude chat that finds or combines blueprints based on what you describe
- [x] **Composite blueprint generation** — Claude merges multiple specs into one if no single match
- [x] **Security badges** — HTTPS, GDPR, keys never stored visible in UI

---

## 🔧 To Do

### Backend (Priority 1)
- [ ] **Supabase setup** — project, auth, database schema
- [ ] **Auth** — email/password + GitHub OAuth
- [ ] **Blueprint storage** — table: id, title, category, description, tags, content, author, karma, status
- [ ] **File storage** — Supabase Storage bucket for .md files
- [ ] **User profiles** — karma score, tier, build credits, upload count
- [ ] **GDPR compliance** — cookie consent, privacy policy, data deletion endpoint
- [ ] **Rate limiting** — per user, per endpoint

### API Proxy (Priority 1)
- [ ] **Claude proxy endpoint** — server-side API call, never expose key to client
- [ ] **Gemini proxy endpoint**
- [ ] **OpenAI proxy endpoint**
- [ ] **Token usage tracking** — log per user per build
- [ ] **Spending caps** — hard limit per user per day/month
- [ ] **Own API key mode** — encrypt key client-side, use for session only, never store

### Payments (Priority 2)
- [ ] **Stripe integration** — pay-as-you-go billing per build
- [ ] **Ko-fi / Buy Me a Coffee** — wire up donation buttons to real links
- [ ] **Subscription tier** — flat monthly fee, included build credits
- [ ] **Credit balance UI** — show remaining builds, top-up option

### Semantic Search (Priority 2)
- [ ] **pgvector on Supabase** — enable vector extension
- [ ] **Blueprint embeddings** — generate + store embedding per blueprint on upload
- [ ] **Semantic search endpoint** — query by embedding similarity, not just keyword
- [ ] **Wire guided discovery** — replace mock library with real DB search

### Scraper Pipeline (Priority 2)
- [ ] **Scheduled scraper** — run weekly via cron (GitHub Actions or Supabase Edge Function)
- [ ] **Auto-import to pending_review** — scraped blueprints land in review queue automatically
- [ ] **Attribution display** — show source repo credit on every scraped blueprint

### Platform Features (Priority 3)
- [ ] **Build result rating** — users rate output quality per LLM after building
- [ ] **LLM comparison data** — aggregate ratings, show which LLM wins per category
- [ ] **Sponsored blueprints** — featured slot, clearly labeled, for relevant tool/SDK companies
- [ ] **Job board** — "hire a builder" — someone wants their blueprint built by a human
- [ ] **User profiles page** — public karma, uploads, builds
- [ ] **Notification system** — "your blueprint was built 10 times today"
- [ ] **Blueprint versioning** — update a spec without losing the original

### Launch
- [ ] **Domain** — register blueprint.md or similar
- [ ] **Deploy** — Vercel (frontend) + Supabase (backend)
- [ ] **Seed library** — run scraper, manually review ~50 quality blueprints before launch
- [ ] **Landing page** — simple explainer for people who land cold
- [ ] **Outreach to Anthropic** — once live with real usage numbers

---

## Files Built So Far

| File | Description |
|------|-------------|
| `blueprint-marketplace.jsx` | Main marketplace UI |
| `blueprint-import-review.jsx` | Admin import review panel |
| `blueprint-discovery.jsx` | Guided Claude discovery chat |
| `blueprint-scraper.js` | GitHub scraper + Claude classifier |
| `SCRAPER-README.md` | Scraper setup instructions |
