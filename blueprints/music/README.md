# Music blueprints

Put **music-related** blueprint `.md` files here (e.g. VST plugin specs, audio tools).

The pipeline runs **only** when files in this folder change. Other blueprints (e.g. under `blueprints/` but not `blueprints/music/`) do not trigger the builder/critic in CI.

Use frontmatter `category: VST` (or App/UI if applicable) and optional `blueprint_id: <uuid>` to write results to Supabase.
