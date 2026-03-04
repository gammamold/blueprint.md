# blueprint_pipeline/agents/scorer.py
# Computes status from critic score; writes results to Supabase.

from datetime import datetime, timezone

from blueprint_pipeline.config import (
    AUTO_APPROVE_THRESHOLD,
    AUTO_REJECT_THRESHOLD,
)
from blueprint_pipeline.db.supabase_client import write_pipeline_results


def compute_status(score: int) -> str:
    """approved | needs_edit | rejected"""
    if score >= AUTO_APPROVE_THRESHOLD:
        return "approved"
    if score < AUTO_REJECT_THRESHOLD:
        return "rejected"
    return "needs_edit"


def write_results(
    blueprint_id: str,
    *,
    build_passed: bool,
    critic_score: int,
    critic_issues: list[str],
    critic_verdict: str,
    dry_run: bool = False,
    source_repo: str | None = None,
    source_url: str | None = None,
) -> None:
    """Compute status and write to DB (unless dry_run). source_repo/source_url set when run from CI."""
    status = compute_status(critic_score)
    pipeline_run_at = datetime.now(tz=timezone.utc).isoformat()

    if dry_run:
        return

    write_pipeline_results(
        blueprint_id,
        build_passed=build_passed,
        critic_score=critic_score,
        critic_issues=critic_issues,
        critic_verdict=critic_verdict,
        pipeline_run_at=pipeline_run_at,
        status=status,
        source_repo=source_repo,
        source_url=source_url,
    )
