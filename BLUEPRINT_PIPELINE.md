# Blueprint.md — Assembly Line Pipeline
## Implementation Guide for Claude Code

**Note:** This project is **music-only** for now (VSTs, synths, effects, music apps). More themes may be added later.

---

## What We're Building

A CI/CD-style pipeline that triggers every time a `.md` blueprint is committed to the repo. It builds the blueprint with an LLM, scores the output against the spec with a critic, and writes results to Supabase. The marketplace only shows blueprints that have passed the pipeline.

The `.md` is both the **input** and the **rubric**. No separate evaluation criteria needed — the critic checks "does the output match what the spec described?"

---

## Core Flow

```
.md committed to blueprints/ folder in repo
        │
        ▼
  GitHub Action triggers pipeline.py --file <changed_file>
        │
        ▼
  Builder agent (Claude) → attempts to build from .md
        │
        ▼
  Critic agent (Gemini) → scores output against the .md spec
        │
        ▼
  Score written to Supabase
        │
        ▼
  Auto-approve (≥75) → live on marketplace
  Flag for review  (40–74) → human checks it
  Auto-reject      (<40)  → not published
```

**Why two different LLMs for build + critique:**
The critic has no bias toward its own output. Claude builds, Gemini reviews independently. That's the honest signal.

**Why not 3 builders:**
All 3 would be doing the same job. Cost without benefit. LLM comparison data is better collected from real user builds over time — users choosing Claude vs Gemini vs GPT and rating results is stronger ground truth than a synthetic test.

---

## File Structure

```
blueprint_pipeline/
├── pipeline.py               # Main entry point, triggered by GitHub Action
├── agents/
│   ├── builder.py            # Claude builds from .md content
│   ├── critic.py             # Gemini scores output against .md spec
│   └── scorer.py             # Writes results back to Supabase
├── brains/
│   ├── vst_brain.py          # Prompts tuned for JUCE/C++ blueprints
│   ├── app_brain.py          # Prompts tuned for React/JS blueprints
│   └── base_brain.py         # Fallback generic prompts
├── db/
│   └── supabase_client.py    # Write scores, update blueprint status
├── config.py                 # API keys, thresholds, brain mapping
└── .github/
    └── workflows/
        └── blueprint_ci.yml  # GitHub Action definition
```

---

## GitHub Action

```yaml
# .github/workflows/blueprint_ci.yml

name: Blueprint Pipeline

on:
  push:
    paths:
      - 'blueprints/**.md'
  pull_request:
    paths:
      - 'blueprints/**.md'

jobs:
  test-blueprint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Get changed .md files
        id: changed
        run: |
          echo "files=$(git diff --name-only HEAD~1 HEAD -- 'blueprints/**.md' | tr '\n' ' ')" >> $GITHUB_OUTPUT

      - name: Run pipeline
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: |
          for file in ${{ steps.changed.outputs.files }}; do
            python pipeline.py --file "$file"
          done
```

**On PRs:** pipeline runs before merge. Score shows up as a check. Bad blueprints don't get merged.
**On push to main:** pipeline runs, score written to Supabase, marketplace updates automatically.

---

## Phase Detail

### Phase 1: Builder Agent (Claude)

**Input:** `.md` blueprint content
**Output:** Generated code string

Prompt (customised per brain):
```
You are an expert software developer.
Build exactly what is described in this blueprint specification.
Produce complete, working, production-ready code.
Return ONLY the code. No explanation.

[blueprint content]
```

- If builder fails → mark pipeline as failed, write error to DB, stop

---

### Phase 2: Critic Agent (Gemini)

**Input:** Original `.md` spec + Claude's code output
**Output:** JSON score

```json
{
  "score": 0-100,
  "built_something": true,
  "matches_spec": true,
  "issues": ["missing filter envelope", "no accent parameter"],
  "verdict": "one sentence summary"
}
```

Critic prompt (per brain):
```
You are a code reviewer.
Compare this code output against the original blueprint specification.
Score how completely the code implements what the spec describes.
Be specific about what is missing or incorrect.

[original .md spec]

[code output]
```

Critic uses Gemini — independent from Claude's build, no bias toward its own output.

---

### Phase 3: Scorer

Writes to Supabase:

```python
{
  "completeness": score,           # real score from critic, not guessed
  "build_passed": True/False,
  "critic_issues": [...],          # what was missing
  "critic_verdict": "...",         # one line summary
  "pipeline_run_at": timestamp,
  "status": "approved" | "needs_edit" | "rejected"
}
```

---

## Brains

Brain is selected automatically based on blueprint `category` field.

### `vst_brain.py`
```python
BUILDER_PROMPT = """
You are an expert JUCE / C++ developer.
Build the VST plugin described in this spec.
Use JUCE 7, C++17, VST3/AU targets.
Include all required files: PluginProcessor.h/cpp, PluginEditor.h/cpp, CMakeLists.txt.
"""

CRITIC_PROMPT = """
Review this JUCE plugin code against the spec.
Check: correct JUCE classes used, all parameters present,
signal flow matches spec, UI components match description.
Score 0-100. Return JSON only.
"""
```

### `app_brain.py`
```python
BUILDER_PROMPT = """
You are an expert React developer.
Build the app described in this spec.
Use React with hooks, Tailwind CSS unless otherwise specified.
Return a single self-contained component.
"""

CRITIC_PROMPT = """
Review this React component against the spec.
Check: all features implemented, correct state management,
no missing UI elements, functional interactions.
Score 0-100. Return JSON only.
"""
```

---

## Config

```python
# config.py

AGENT_RETRY_COUNT = 2

AUTO_APPROVE_THRESHOLD = 75
AUTO_REJECT_THRESHOLD  = 40

BUILDER_LLM = "anthropic"   # Claude builds
CRITIC_LLM  = "google"      # Gemini critiques

CATEGORY_BRAIN_MAP = {
  "VST":    "vst_brain",
  "App":    "app_brain",
  "UI":     "app_brain",
  "Script": "base_brain",
  "Game":   "base_brain",
  "Other":  "base_brain",
}
```

---

## DB Changes Needed

Add to `blueprints` table in Supabase:

```sql
alter table public.blueprints
  add column build_passed      boolean,
  add column critic_score      int,
  add column critic_issues     jsonb,
  add column critic_verdict    text,
  add column pipeline_run_at   timestamptz;
```

---

## Reuses From Music Pipeline

- `spawn_agent(provider, prompt, retries)` — copy directly, no changes
- Retry logic — copy as-is
- Timeout handling — copy as-is
- Brain loading pattern — adapt for category-based selection

---

## What's Different From Music Pipeline

| Music Pipeline | Blueprint Pipeline |
|---|---|
| Triggered manually / GUI | Triggered by GitHub commit |
| Fixed 8 blocks | One blueprint per run |
| 3 LLMs doing different jobs | 1 builder + 1 independent critic |
| Merge outputs | No merge — critic scores one output |
| Export to files | Write score to Supabase |
| Style brains | Category brains (VST, App, etc.) |

---

## Priority Build Order

1. `.github/workflows/blueprint_ci.yml` — trigger on commit
2. `config.py` — keys, thresholds, brain map
3. `db/supabase_client.py` — write results
4. `agents/builder.py` — reuse `spawn_agent` from music pipeline
5. `agents/critic.py` — Gemini reviewer, returns JSON score
6. `agents/scorer.py` — writes to DB, sets status
7. `brains/vst_brain.py` + `brains/app_brain.py` — prompts
8. `pipeline.py` — wire everything together, `--file` arg
