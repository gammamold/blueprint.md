// ============================================================
// pages/api/admin/action.js — Admin blueprint actions
// POST /api/admin/action
// Body: { blueprintId, action: "approved"|"rejected"|"needs_edit", edits? }
// Requires: authenticated user with tier = "admin"
// ============================================================

import { supabase, supabaseAdmin } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Verify admin
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return res.status(401).json({ error: "Invalid session" });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  if (!profile || profile.tier !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { blueprintId, action, edits } = req.body;
  if (!blueprintId || !action) {
    return res.status(400).json({ error: "Missing blueprintId or action" });
  }
  if (!["approved", "rejected", "needs_edit"].includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  // Apply metadata edits if provided
  const updates = { status: action };
  if (edits) {
    if (edits.title) updates.title = edits.title;
    if (edits.description) updates.description = edits.description;
    if (edits.category) updates.category = edits.category;
    if (edits.tags) {
      updates.tags = typeof edits.tags === "string"
        ? edits.tags.split(",").map(t => t.trim()).filter(Boolean)
        : edits.tags;
    }
  }

  const { error } = await supabaseAdmin
    .from("blueprints")
    .update(updates)
    .eq("id", blueprintId);

  if (error) return res.status(500).json({ error: error.message });

  // Award karma when approving
  if (action === "approved") {
    await supabaseAdmin.rpc("award_upload_karma", { blueprint_id: blueprintId });
  }

  return res.status(200).json({ ok: true });
}
