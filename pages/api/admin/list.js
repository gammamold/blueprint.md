// ============================================================
// pages/api/admin/list.js — List all blueprints for admin review
// GET /api/admin/list
// Requires: authenticated user with tier = "admin"
// ============================================================

import { supabase, supabaseAdmin } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

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

  const { data, error } = await supabaseAdmin
    .from("blueprints")
    .select(`*, profiles(username)`)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json(data);
}
