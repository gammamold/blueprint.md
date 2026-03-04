-- ============================================================
-- Blueprint pipeline: columns for critic score and pipeline run
-- Run this in your Supabase SQL editor
-- ============================================================

alter table public.blueprints
  add column if not exists build_passed    boolean default false,
  add column if not exists critic_score    int,
  add column if not exists critic_issues   jsonb,
  add column if not exists critic_verdict  text,
  add column if not exists pipeline_run_at timestamptz;

comment on column public.blueprints.build_passed is 'Whether the builder produced code';
comment on column public.blueprints.critic_score is 'Score 0-100 from critic (Gemini)';
comment on column public.blueprints.critic_issues is 'List of issues from critic';
comment on column public.blueprints.critic_verdict is 'One-line verdict from critic';
comment on column public.blueprints.pipeline_run_at is 'Last time the pipeline ran for this blueprint';
