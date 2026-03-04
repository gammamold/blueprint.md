// ============================================================
// pages/api/discover.js — Server-side guided discovery proxy
// POST /api/discover
// Body: { messages: [{role, content}], library?: [{id, title, ...}] }
// ============================================================

import { supabaseAdmin } from "@/lib/supabase";

function buildSystemPrompt(library) {
  return `You are the Blueprint.md discovery assistant for music tools only. You help users find or create the right .md blueprint specification to build music software (VSTs, synths, effects, music apps) using AI.

You have access to this music blueprint library:
${JSON.stringify(library, null, 2)}

Your job:
1. Ask targeted questions to understand what music tool the user wants to build (plugins, synths, effects, music apps, etc.)
2. Search the library and recommend the best matches — or combine multiple blueprints if needed
3. If nothing matches well, offer to generate a new composite music blueprint spec

Keep responses SHORT and conversational. Ask ONE question at a time max.
When recommending blueprints, return them in this exact JSON format embedded in your response:

<blueprints>
[{"id": "the-blueprint-uuid", "reason": "why this matches"}]
</blueprints>

If you're generating a new composite blueprint, wrap it in:
<composite>
# Title
...full markdown spec...
</composite>

Always be friendly, non-technical in your language, and focus on what the user is trying to ACCOMPLISH, not technical details unless they ask.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing messages" });
  }

  // Fetch current approved blueprints for context
  const { data: bps } = await supabaseAdmin
    .from("blueprints")
    .select("id, title, category, tags, description")
    .eq("status", "approved")
    .order("karma", { ascending: false })
    .limit(50);

  const library = bps || [];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: buildSystemPrompt(library),
      messages,
    }),
  });

  if (!response.ok) {
    return res.status(502).json({ error: "Discovery service unavailable" });
  }

  const data = await response.json();
  if (data.error) return res.status(502).json({ error: data.error.message });

  const reply = data.content?.find(b => b.type === "text")?.text || "";
  return res.status(200).json({ reply, library });
}
