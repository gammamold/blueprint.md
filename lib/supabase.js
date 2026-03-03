// ============================================================
// lib/supabase.js — Supabase client + all DB helpers
// ============================================================

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY ?? "";

// ─── CLIENT (browser-safe) ───────────────────────────────────
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// ─── SERVICE CLIENT (server-side only — never import on client) ──
export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

// ============================================================
// AUTH
// ============================================================

export const auth = {
  async signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username } }
    });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signInWithGitHub() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
    if (error) throw error;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  onAuthChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// ============================================================
// PROFILES
// ============================================================

export const profiles = {
  async get(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data;
  },

  async update(userId, updates) {
    const { data, error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getByUsername(username) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single();
    if (error) throw error;
    return data;
  }
};

// ============================================================
// BLUEPRINTS
// ============================================================

export const blueprints = {
  async list({ category, search, limit = 100, offset = 0 } = {}) {
    if (!supabase) return [];
    let query = supabase
      .from("blueprints")
      .select(`
        id, title, description, category, tags, karma,
        download_count, build_count, completeness, created_at,
        profiles(username, tier)
      `)
      .eq("status", "approved")
      .order("karma", { ascending: false })
      .range(offset, offset + limit - 1);

    if (category && category !== "All") query = query.eq("category", category);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async get(id) {
    const { data, error } = await supabase
      .from("blueprints")
      .select(`*, profiles(username, tier, karma)`)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async create({ title, description, content, category, tags, tech_stack, completeness, authorId }) {
    // Upload .md file to storage
    const filename = `${authorId}/${Date.now()}-${title.replace(/\s+/g, "-").toLowerCase()}.md`;
    const { error: uploadError } = await supabase.storage
      .from("blueprints")
      .upload(filename, new Blob([content], { type: "text/markdown" }));
    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from("blueprints")
      .insert({
        title, description, content, category,
        tags: typeof tags === "string" ? tags.split(",").map(t => t.trim()).filter(Boolean) : tags,
        tech_stack: tech_stack || [],
        completeness: completeness || 70,
        author_id: authorId,
        validation_passed: true,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async searchSemantic(queryEmbedding, { threshold = 0.7, limit = 10 } = {}) {
    const { data, error } = await supabase.rpc("search_blueprints", {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
    });
    if (error) throw error;
    return data;
  },

  async trackDownload(id) {
    await supabase.rpc("increment_download_count", { bp_id: id });
  },

  // ── ADMIN ONLY ──
  async approve(id) {
    const { error } = await supabaseAdmin
      .from("blueprints")
      .update({ status: "approved" })
      .eq("id", id);
    if (error) throw error;
    await supabaseAdmin.rpc("award_upload_karma", { blueprint_id: id });
  },

  async reject(id) {
    const { error } = await supabaseAdmin
      .from("blueprints")
      .update({ status: "rejected" })
      .eq("id", id);
    if (error) throw error;
  },

  async updateMetadata(id, updates) {
    const { error } = await supabaseAdmin
      .from("blueprints")
      .update(updates)
      .eq("id", id);
    if (error) throw error;
  },

  async getPending() {
    const { data, error } = await supabaseAdmin
      .from("blueprints")
      .select(`*, profiles(username)`)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }
};

// ============================================================
// BUILDS
// ============================================================

export const builds = {
  async create({ blueprintId, userId, llm, accessMode, tokensUsed, costUsd }) {
    // Atomically increment blueprint build count via stored procedure
    await supabaseAdmin.rpc("increment_build_count", { bp_id: blueprintId });

    const { data, error } = await supabaseAdmin
      .from("builds")
      .insert({
        blueprint_id: blueprintId,
        user_id: userId,
        llm,
        access_mode: accessMode,
        tokens_used: tokensUsed,
        cost_usd: costUsd,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async rate(buildId, rating, note) {
    const { error } = await supabase
      .from("builds")
      .update({ rating, rating_note: note })
      .eq("id", buildId);
    if (error) throw error;
  },

  async getStats(blueprintId) {
    const { data, error } = await supabase
      .from("builds")
      .select("llm, rating")
      .eq("blueprint_id", blueprintId)
      .not("rating", "is", null);
    if (error) throw error;

    const stats = {};
    for (const build of data) {
      if (!stats[build.llm]) stats[build.llm] = { total: 0, count: 0 };
      stats[build.llm].total += build.rating;
      stats[build.llm].count++;
    }
    return Object.entries(stats).map(([llm, s]) => ({
      llm,
      avg_rating: (s.total / s.count).toFixed(1),
      build_count: s.count,
    }));
  }
};

// ============================================================
// CREDITS
// ============================================================

export const credits = {
  async spend(userId, blueprintId) {
    const { data, error } = await supabase.rpc("spend_build_credit", {
      p_user_id: userId,
      p_blueprint_id: blueprintId,
    });
    if (error) throw error;
    return data;
  },

  async getBalance(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("build_credits")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data.build_credits;
  },

  async getHistory(userId) {
    const { data, error } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  }
};
