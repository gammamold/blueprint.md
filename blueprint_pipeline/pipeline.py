# blueprint_pipeline/pipeline.py
# Main entry: run on one .md file (--file). Build with Claude, critique with Gemini, write score to Supabase.

import argparse
import os
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from blueprint_pipeline.config import CATEGORIES
from blueprint_pipeline.agents.builder import build_one
from blueprint_pipeline.agents.critic import run_critic
from blueprint_pipeline.agents.scorer import compute_status, write_results
from blueprint_pipeline.brains import get_brain


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Return (frontmatter dict, body). Frontmatter is between first --- and second ---."""
    fm = {}
    body = content
    if content.strip().startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            body = parts[2].lstrip("\n")
            for line in parts[1].strip().split("\n"):
                if ":" in line:
                    k, v = line.split(":", 1)
                    fm[k.strip().lower()] = v.strip()
    return fm, body


def run_pipeline(file_path: str, blueprint_id: str | None, dry_run: bool) -> dict:
    """Run build -> critic -> scorer for one .md file. Returns result summary."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Blueprint file not found: {path}")

    content = path.read_text(encoding="utf-8")
    frontmatter, body = parse_frontmatter(content)
    category = frontmatter.get("category") or "Other"
    if category not in CATEGORIES:
        category = "Other"
    bid = blueprint_id or frontmatter.get("blueprint_id")

    brain_name = CATEGORIES.get(category, "base_brain")
    brain = get_brain(brain_name)
    builder_prompt = brain["builder_prompt"]
    critic_prompt = brain["critic_prompt"]

    print(f"  Building ({brain_name})...")
    code = build_one(body, builder_prompt)
    build_passed = bool(code and code.strip())
    if not build_passed:
        print("  Build failed (no output).")
        code = ""

    print("  Critic...")
    critic_result = run_critic(body, code, critic_prompt)
    score = critic_result["score"]
    issues = critic_result.get("issues", [])
    verdict = critic_result.get("verdict", "")

    status = compute_status(score)
    print(f"  Score={score} -> {status}")

    source_repo = os.environ.get("GITHUB_REPOSITORY")
    source_url = None
    if source_repo and os.environ.get("GITHUB_SERVER_URL") and os.environ.get("GITHUB_SHA"):
        base = os.environ.get("GITHUB_SERVER_URL", "https://github.com").rstrip("/")
        source_url = f"{base}/{source_repo}/commit/{os.environ.get('GITHUB_SHA')}"

    if bid and not dry_run:
        write_results(
            str(bid),
            build_passed=build_passed,
            critic_score=score,
            critic_issues=issues,
            critic_verdict=verdict,
            dry_run=False,
            source_repo=source_repo,
            source_url=source_url,
        )
    elif not bid:
        print("  (No blueprint_id in frontmatter or --blueprint-id; skipping DB write)")

    return {
        "file": str(path),
        "score": score,
        "status": status,
        "build_passed": build_passed,
        "verdict": verdict[:200],
    }


def main():
    parser = argparse.ArgumentParser(description="Blueprint pipeline: build, critique, score.")
    parser.add_argument("--file", required=True, help="Path to .md blueprint file (e.g. blueprints/foo.md)")
    parser.add_argument("--blueprint-id", default=None, help="Supabase blueprint UUID (or set in frontmatter as blueprint_id)")
    parser.add_argument("--dry-run", action="store_true", help="Do not write to Supabase")
    args = parser.parse_args()

    run_pipeline(args.file, args.blueprint_id, args.dry_run)
    print("Pipeline finished.")


if __name__ == "__main__":
    main()
