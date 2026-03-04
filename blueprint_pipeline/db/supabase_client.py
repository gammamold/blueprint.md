# blueprint_pipeline/db/supabase_client.py
# Write pipeline results to Supabase

import os
from supabase import create_client, Client

from blueprint_pipeline.config import SUPABASE_URL, SUPABASE_SERVICE_KEY


def _client() -> Client:
    url = SUPABASE_URL or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = SUPABASE_SERVICE_KEY or os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY (or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY) must be set"
        )
    return create_client(url, key)


def write_pipeline_results(
    blueprint_id: str,
    *,
    build_passed: bool,
    critic_score: int,
    critic_issues: list[str],
    critic_verdict: str,
    pipeline_run_at: str,
    status: str,
    source_repo: str | None = None,
    source_url: str | None = None,
) -> list:
    """
    Write pipeline results back to Supabase.
    status: 'approved' | 'needs_edit' | 'rejected'
    source_repo / source_url: set when run from CI (e.g. owner/repo, commit URL).
    """
    client = _client()
    payload = {
        "build_passed": build_passed,
        "critic_score": critic_score,
        "critic_issues": critic_issues,
        "critic_verdict": critic_verdict[:1000] if critic_verdict else None,
        "pipeline_run_at": pipeline_run_at,
        "completeness": critic_score,  # keep for backward compatibility with existing schema
        "status": status,
        "updated_at": pipeline_run_at,
    }
    if source_repo:
        payload["source_repo"] = source_repo[:500]
    if source_url:
        payload["source_url"] = source_url[:2000]
    resp = (
        client.table("blueprints")
        .update(payload)
        .eq("id", blueprint_id)
        .execute()
    )
    return resp.data or []
