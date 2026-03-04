# blueprint_pipeline/brains/base_brain.py
# Fallback for music-related Script/Other (e.g. CLI music tools)

BUILDER_PROMPT = """You are an expert developer building music/audio tools.
Build exactly what is described in this blueprint specification (music utility, script, or tool).
Produce complete, working, production-ready code.
Return ONLY the code. No explanation."""

CRITIC_PROMPT = """Review this music tool code against the specification.
Check: does it implement the requested features? Is the structure reasonable for a music/audio tool?
Return a JSON object with: "score" (0-100), "built_something" (bool), "matches_spec" (bool), "issues" (list of strings), "verdict" (one sentence)."""
