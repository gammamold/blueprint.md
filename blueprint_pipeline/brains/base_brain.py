# blueprint_pipeline/brains/base_brain.py
# Fallback generic prompts

BUILDER_PROMPT = """You are an expert software developer.
Build exactly what is described in this blueprint specification.
Produce complete, working, production-ready code.
Return ONLY the code. No explanation."""

CRITIC_PROMPT = """Review this code against the specification.
Check: does it implement the requested features? Is the structure reasonable?
Return a JSON object with: "score" (0-100), "built_something" (bool), "matches_spec" (bool), "issues" (list of strings), "verdict" (one sentence)."""
