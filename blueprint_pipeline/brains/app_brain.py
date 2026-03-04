# blueprint_pipeline/brains/app_brain.py
# Prompts tuned for music apps (React/JS)

BUILDER_PROMPT = """You are an expert React developer building music tools.
Build the music app or utility described in this spec (e.g. BPM tool, metronome, simple music utility).
Use React with hooks, Tailwind CSS unless otherwise specified.
Return a single self-contained component or a minimal app.
Return ONLY the code. No explanation."""

CRITIC_PROMPT = """Review this React music app/component against the spec.
Check: all features implemented, correct state management,
no missing UI elements, functional interactions. Ensure it matches the described music tool.
Return a JSON object with: "score" (0-100), "built_something" (bool), "matches_spec" (bool), "issues" (list of strings), "verdict" (one sentence)."""
