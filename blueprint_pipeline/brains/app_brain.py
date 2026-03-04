# blueprint_pipeline/brains/app_brain.py
# Prompts tuned for React/JS blueprints

BUILDER_PROMPT = """You are an expert React developer.
Build the app described in this spec.
Use React with hooks, Tailwind CSS unless otherwise specified.
Return a single self-contained component or a minimal app.
Return ONLY the code. No explanation."""

CRITIC_PROMPT = """Review this React component against the spec.
Check: all features implemented, correct state management,
no missing UI elements, functional interactions.
Return a JSON object with: "score" (0-100), "built_something" (bool), "matches_spec" (bool), "issues" (list of strings), "verdict" (one sentence)."""
