# Blueprint Pipeline

CI-style pipeline for blueprint `.md` files: **Claude** builds from the spec, **Gemini** scores the output against the spec, results are written to Supabase. The marketplace only shows blueprints that have passed the pipeline.

## Flow

1. **Trigger:** GitHub Action runs only when **music-related** `.md` files under `blueprints/music/**/*.md` change (push or PR).
2. **Build:** Claude builds from the `.md` content (prompt depends on category brain).
3. **Critic:** Gemini scores the build against the spec (independent of Claude — no self-bias).
4. **Scorer:** Writes `build_passed`, `critic_score`, `critic_issues`, `critic_verdict`, `status` to Supabase.

- **approved** — score ≥ 75  
- **needs_edit** — 40 ≤ score < 75  
- **rejected** — score < 40  

## Setup

1. **Python 3.11+**, from project root:
   ```bash
   pip install -r blueprint_pipeline/requirements.txt
   ```

2. **Environment** (or GitHub secrets for CI):
   - `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `ANTHROPIC_API_KEY`
   - `GEMINI_API_KEY`

3. **DB:** Run `blueprint_pipeline/supabase-pipeline-migration.sql` in the Supabase SQL editor.

---

## Run in the cloud (GitHub Actions)

The assembly line runs automatically in the cloud when you push or open a PR that changes any **music** blueprint under `blueprints/music/**/*.md`.

**1. Add repository secrets**

In your GitHub repo: **Settings** (left sidebar) → **Security** → **Secrets and variables** → **Actions** → **New repository secret**. Add:

| Secret name | Value | Where you have it |
|-------------|--------|-------------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Same as in `.env.local` |
| `GEMINI_API_KEY` | Your Google Gemini API key | Same as in `.env.local` |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Same as `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Same as in `.env.local` |

**2. Push a blueprint**

- Commit and push any change under `blueprints/music/` (e.g. add or edit a VST or music-related spec).
- The workflow **Blueprint Pipeline** will run in the **Actions** tab.
- Each changed `.md` file is built (Claude) and scored (Gemini); results are written to Supabase if the file has `blueprint_id` in frontmatter.

**3. Check runs**

- **Actions** → select the **Blueprint Pipeline** workflow → open the latest run to see logs and any errors.

## Run locally

```bash
# From project root
python blueprint_pipeline/pipeline.py --file blueprints/my-spec.md

# With explicit blueprint row (else use frontmatter blueprint_id)
python blueprint_pipeline/pipeline.py --file blueprints/my-spec.md --blueprint-id <uuid>

# No DB write
python blueprint_pipeline/pipeline.py --file blueprints/my-spec.md --dry-run
```

**Frontmatter in `.md`:** Optional `blueprint_id: <uuid>` and `category: VST|App|UI|...` so the pipeline knows which row to update and which brain to use.

## Layout

- `pipeline.py` — entry point, `--file` and optional `--blueprint-id`, `--dry-run`
- `agents/builder.py` — Claude build (single output)
- `agents/critic.py` — Gemini review, returns JSON score
- `agents/scorer.py` — status logic and Supabase write
- `brains/` — category prompts (vst_brain, app_brain, base_brain)
- `db/supabase_client.py` — write results
- `config.py` — keys, thresholds, `BUILDER_LLM`, `CRITIC_LLM`
