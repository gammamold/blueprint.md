// ============================================================
// pages/api/build.js — Server-side LLM proxy
// POST /api/build
// Body: { blueprintId, llm, accessMode, userApiKey? }
// ============================================================

import { supabase, supabaseAdmin, builds, credits } from "@/lib/supabase";

const COSTS = {
  claude:  { input: 0.000003, output: 0.000015 },
  gemini:  { input: 0.0000025, output: 0.00001 },
  chatgpt: { input: 0.000005, output: 0.000015 },
};

async function callClaude(blueprintContent, apiKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey || process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{
        role: "user",
        content: `You are an expert software developer. Build exactly what is described in this blueprint specification. Produce complete, working, production-ready code.\n\n${blueprintContent}`
      }]
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return {
    content: data.content?.find(b => b.type === "text")?.text || "",
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
  };
}

async function callGemini(blueprintContent, apiKey) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `You are an expert software developer. Build exactly what is described in this blueprint specification. Produce complete, working, production-ready code.\n\n${blueprintContent}` }]
      }]
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    inputTokens: data.usageMetadata?.promptTokenCount || 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
  };
}

async function callOpenAI(blueprintContent, apiKey) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey || process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 8000,
      messages: [{
        role: "user",
        content: `You are an expert software developer. Build exactly what is described in this blueprint specification. Produce complete, working, production-ready code.\n\n${blueprintContent}`
      }]
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return {
    content: data.choices?.[0]?.message?.content || "",
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
  };
}

const LLM_CALLERS = { claude: callClaude, gemini: callGemini, chatgpt: callOpenAI };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { blueprintId, llm, accessMode, userApiKey } = req.body;

  if (!blueprintId || !llm || !accessMode) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!["claude", "gemini", "chatgpt"].includes(llm)) {
    return res.status(400).json({ error: "Invalid LLM" });
  }
  if (!["own_key", "credits", "payg"].includes(accessMode)) {
    return res.status(400).json({ error: "Invalid access mode" });
  }

  // Get user from session token
  const token = req.headers.authorization?.split(" ")[1];
  let userId = null;
  if (token) {
    const { data } = await supabase.auth.getUser(token);
    userId = data.user?.id;
  }

  if (accessMode !== "own_key" && !userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (accessMode === "own_key" && !userApiKey) {
    return res.status(400).json({ error: "API key required for own_key mode" });
  }

  // Deduct credit before calling LLM
  if (accessMode === "credits") {
    const spent = await credits.spend(userId, blueprintId);
    if (!spent) return res.status(402).json({ error: "Insufficient build credits" });
  }

  // Fetch blueprint content
  const { data: blueprint, error: bpError } = await supabaseAdmin
    .from("blueprints")
    .select("content, title")
    .eq("id", blueprintId)
    .single();

  if (bpError || !blueprint) {
    return res.status(404).json({ error: "Blueprint not found" });
  }

  // Rate limiting — max 10 builds per user per hour
  if (userId) {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count } = await supabaseAdmin
      .from("builds")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneHourAgo);

    if (count >= 10) {
      return res.status(429).json({ error: "Rate limit: max 10 builds per hour" });
    }
  }

  // Call the LLM
  const caller = LLM_CALLERS[llm];
  let result;
  try {
    result = await caller(blueprint.content, accessMode === "own_key" ? userApiKey : null);
  } catch (e) {
    return res.status(502).json({ error: `LLM error: ${e.message}` });
  }

  // Calculate cost
  const costRates = COSTS[llm];
  const costUsd = (result.inputTokens / 1000 * costRates.input) +
                  (result.outputTokens / 1000 * costRates.output);

  // Log the build
  if (userId) {
    await builds.create({
      blueprintId,
      userId,
      llm,
      accessMode,
      tokensUsed: result.inputTokens + result.outputTokens,
      costUsd,
    });
  }

  return res.status(200).json({
    content: result.content,
    tokens: result.inputTokens + result.outputTokens,
    cost_usd: costUsd.toFixed(6),
  });
}
