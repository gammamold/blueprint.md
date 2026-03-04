# blueprint_pipeline/agents/critic.py
# Gemini scores builder output against the .md spec (independent of Claude).

import json
import re

from blueprint_pipeline.agents.builder import spawn_agent
from blueprint_pipeline.config import AGENT_RETRY_COUNT, CRITIC_LLM


def _extract_json(text: str) -> dict | None:
    text = text.strip()
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except json.JSONDecodeError:
            pass
    # Find first {...} (simple)
    start = text.find("{")
    if start >= 0:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start : i + 1])
                    except json.JSONDecodeError:
                        break
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def run_critic(blueprint_content: str, code: str | None, critic_prompt: str) -> dict:
    """
    Run critic (Gemini) on the single build output. Returns score, built_something, matches_spec, issues, verdict.
    """
    if not code or not code.strip():
        return {
            "score": 0,
            "built_something": False,
            "matches_spec": False,
            "issues": ["No code produced"],
            "verdict": "No output.",
        }
    prompt = f"""You are a code reviewer.
Compare this code output against the original blueprint specification.
Score how completely the code implements what the spec describes.
Be specific about what is missing or incorrect.

{critic_prompt}

## Original specification
{blueprint_content[:8000]}

## Code output
```
{code[:12000]}
```

Return only a single JSON object with keys: score (0-100), built_something (bool), matches_spec (bool), issues (list of strings), verdict (one sentence)."""
    try:
        raw = spawn_agent(CRITIC_LLM, prompt, retries=AGENT_RETRY_COUNT)
        if not raw:
            return _default_critic_result(0, "No critic response.")
        out = _extract_json(raw)
        if not out:
            return _default_critic_result(50, "Critic did not return valid JSON.")
        return {
            "score": int(out.get("score", 0)),
            "built_something": bool(out.get("built_something", True)),
            "matches_spec": bool(out.get("matches_spec", False)),
            "issues": list(out.get("issues", [])) if isinstance(out.get("issues"), list) else [],
            "verdict": str(out.get("verdict", ""))[:500],
        }
    except Exception as e:
        return _default_critic_result(0, str(e))


def _default_critic_result(score: int, verdict: str) -> dict:
    return {
        "score": score,
        "built_something": score > 20,
        "matches_spec": score > 50,
        "issues": [verdict] if verdict else [],
        "verdict": verdict or "Error running critic.",
    }
