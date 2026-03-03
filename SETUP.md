# Blueprint.md — Setup Checklist

## ✅ Done for you

- [x] `npm install` — dependencies installed
- [x] `.env.local` created from `.env.local.example` (fill in real values below)

---

## 🔧 Manual steps (do these in order)

### 1. Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. **New project** → choose org, name (e.g. `blueprint`), database password, region.
3. Wait for the project to be ready.

### 2. Run the schema

1. In the Supabase dashboard: **SQL Editor**.
2. Open `supabase-schema.sql` from this repo and copy its full contents.
3. Paste into the SQL editor and **Run**.
4. Confirm no errors (extensions, tables, RLS, functions created).

### 3. Fill `.env.local` with Supabase keys

1. In Supabase: **Settings** → **API**.
2. Copy **Project URL** → put in `NEXT_PUBLIC_SUPABASE_URL`.
3. Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copy **service_role** key → `SUPABASE_SERVICE_KEY` (keep secret).

### 4. Enable GitHub OAuth

1. **Authentication** → **Providers** → **GitHub**.
2. Turn **Enable Sign in with GitHub** ON.
3. Create a GitHub OAuth App (or use existing):  
   - Authorization callback URL: `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`
4. Paste **Client ID** and **Client Secret** into Supabase GitHub provider, Save.

### 5. Enable vector extension

1. **Database** → **Extensions**.
2. Search for **vector** (pgvector).
3. Enable it (schema `extensions`).  
   *(The schema SQL also enables it; enabling in the UI ensures it’s available.)*

### 6. Storage bucket

1. **Storage** → **New bucket**.
2. Name: `blueprints`.
3. Set to **Public bucket** (public read).
4. Create.

### 7. Anthropic API key

1. Get an API key from [console.anthropic.com](https://console.anthropic.com).
2. Put it in `.env.local` as `ANTHROPIC_API_KEY=sk-ant-...`.

---

## ▶ Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app should start without errors once Supabase and `ANTHROPIC_API_KEY` are set in `.env.local`.
