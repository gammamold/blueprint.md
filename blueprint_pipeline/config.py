# blueprint_pipeline/config.py
# API keys, concurrency settings, thresholds

import os
from pathlib import Path

# Load .env if present (e.g. from project root)
_root = Path(__file__).resolve().parent.parent
_env = _root / ".env"
if not _env.exists():
    _env = _root / ".env.local"
if _env.exists():
    for line in _env.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

# Retries and thresholds
AGENT_RETRY_COUNT = int(os.environ.get("AGENT_RETRY_COUNT", "2"))
AUTO_APPROVE_THRESHOLD = int(os.environ.get("AUTO_APPROVE_THRESHOLD", "75"))
AUTO_REJECT_THRESHOLD = int(os.environ.get("AUTO_REJECT_THRESHOLD", "40"))

# One builder (Claude), one critic (Gemini) — independent review, no bias
BUILDER_LLM = os.environ.get("BUILDER_LLM", "anthropic")
CRITIC_LLM = os.environ.get("CRITIC_LLM", "google")

# Category -> brain module name
CATEGORIES = {
    "VST": "vst_brain",
    "App": "app_brain",
    "UI": "app_brain",
    "Script": "base_brain",
    "Game": "base_brain",
    "Other": "base_brain",
}

# Supabase (use SUPABASE_URL + SUPABASE_SERVICE_KEY or NEXT_PUBLIC_* for URL)
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

# LLM API keys
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
