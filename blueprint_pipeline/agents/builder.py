# blueprint_pipeline/agents/builder.py
# Calls LLM with blueprint content, returns code. Reusable spawn_agent with retries.

import json
import time
from typing import Any

from blueprint_pipeline.config import (
    AGENT_RETRY_COUNT,
    ANTHROPIC_API_KEY,
    BUILDER_LLM,
    GEMINI_API_KEY,
    OPENAI_API_KEY,
)


def spawn_agent(provider: str, prompt: str, retries: int | None = None) -> str | None:
    """
    Call one LLM (anthropic | google | openai). Retry on failure.
    Returns response text or None on failure.
    """
    retries = retries if retries is not None else AGENT_RETRY_COUNT
    last_error = None
    for attempt in range(retries + 1):
        try:
            if provider == "anthropic":
                return _call_anthropic(prompt)
            if provider == "google":
                return _call_google(prompt)
            if provider == "openai":
                return _call_openai(prompt)
            raise ValueError(f"Unknown provider: {provider}")
        except Exception as e:
            last_error = e
            if attempt < retries:
                time.sleep(1.0 * (attempt + 1))
    if last_error:
        raise last_error
    return None


def _call_anthropic(prompt: str) -> str:
    import urllib.request
    import urllib.error

    body = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 8192,
        "messages": [{"role": "user", "content": prompt}],
    }
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.loads(r.read().decode())
    text = (data.get("content") or [])
    for block in text:
        if block.get("type") == "text":
            return block.get("text", "")
    return ""


def _call_google(prompt: str) -> str:
    import urllib.request
    import urllib.error

    key = GEMINI_API_KEY
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.loads(r.read().decode())
    return (
        (data.get("candidates") or [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )


def _call_openai(prompt: str) -> str:
    import urllib.request

    body = {
        "model": "gpt-4o",
        "max_tokens": 8192,
        "messages": [{"role": "user", "content": prompt}],
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        data = json.loads(r.read().decode())
    return (data.get("choices") or [{}])[0].get("message", {}).get("content", "")


def build_one(blueprint_content: str, builder_prompt: str) -> str | None:
    """
    Single builder (Claude). Returns generated code or None on failure.
    """
    full_prompt = f"{builder_prompt.strip()}\n\n{blueprint_content}"
    try:
        return spawn_agent(BUILDER_LLM, full_prompt)
    except Exception:
        return None
