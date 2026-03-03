-- ============================================================
-- BLUEPRINT.MD — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector"; -- for semantic search (pgvector)

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id              uuid references auth.users(id) on delete cascade primary key,
  username        text unique not null,
  avatar_url      text,
  bio             text,
  
  -- Karma & tier system
  karma           int default 0,
  tier            text default 'lurker' check (tier in ('lurker', 'contributor', 'donor', 'admin')),
  build_credits   int default 3,        -- free credits for new users
  
  -- Stats
  upload_count    int default 0,
  build_count     int default 0,
  total_donated   numeric(10,2) default 0,
  
  -- Timestamps
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- BLUEPRINTS
-- ============================================================
create table public.blueprints (
  id              uuid default uuid_generate_v4() primary key,
  
  -- Content
  title           text not null,
  description     text not null,
  content         text not null,           -- full .md content
  category        text not null check (category in ('VST', 'App', 'UI', 'Game', 'Script', 'Other')),
  tags            text[] default '{}',
  tech_stack      text[] default '{}',
  
  -- Authorship
  author_id       uuid references public.profiles(id) on delete set null,
  is_scraped      boolean default false,
  source_repo     text,                    -- GitHub repo if scraped
  source_url      text,                    -- original file URL
  source_license  text,
  attribution     text,
  
  -- Quality
  karma           int default 0,
  completeness    int default 0,           -- 0-100, set by validator
  validation_passed boolean default false,
  
  -- Status
  status          text default 'pending' check (status in ('pending', 'approved', 'rejected', 'needs_edit')),
  
  -- Stats
  download_count  int default 0,
  build_count     int default 0,
  
  -- Semantic search
  embedding       vector(1536),            -- OpenAI/Claude embedding for similarity search
  
  -- Timestamps
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Index for semantic search
create index on public.blueprints using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Index for common queries
create index on public.blueprints (category);
create index on public.blueprints (status);
create index on public.blueprints (karma desc);
create index on public.blueprints using gin (tags);

-- ============================================================
-- BUILDS (track every time someone builds a blueprint)
-- ============================================================
create table public.builds (
  id              uuid default uuid_generate_v4() primary key,
  blueprint_id    uuid references public.blueprints(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete set null,
  
  -- Which LLM was used
  llm             text not null check (llm in ('claude', 'gemini', 'chatgpt')),
  access_mode     text not null check (access_mode in ('own_key', 'credits', 'payg')),
  
  -- Token usage & cost
  tokens_used     int default 0,
  cost_usd        numeric(10,6) default 0,
  
  -- Quality rating (user rates the output after building)
  rating          int check (rating between 1 and 5),
  rating_note     text,
  
  created_at      timestamptz default now()
);

-- ============================================================
-- CREDITS & PAYMENTS
-- ============================================================
create table public.credit_transactions (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references public.profiles(id) on delete cascade,
  
  amount          int not null,            -- positive = added, negative = spent
  reason          text not null,           -- 'upload', 'build', 'donation', 'subscription', 'admin'
  reference_id    uuid,                    -- blueprint_id or build_id if relevant
  
  created_at      timestamptz default now()
);

-- ============================================================
-- DONATIONS
-- ============================================================
create table public.donations (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references public.profiles(id) on delete set null,
  amount_usd      numeric(10,2) not null,
  stripe_payment_id text,
  created_at      timestamptz default now()
);

-- ============================================================
-- SEMANTIC SEARCH FUNCTION
-- ============================================================
create or replace function search_blueprints(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count     int default 10
)
returns table (
  id          uuid,
  title       text,
  description text,
  category    text,
  tags        text[],
  karma       int,
  similarity  float
)
language sql stable
as $$
  select
    b.id, b.title, b.description, b.category, b.tags, b.karma,
    1 - (b.embedding <=> query_embedding) as similarity
  from public.blueprints b
  where
    b.status = 'approved'
    and 1 - (b.embedding <=> query_embedding) > match_threshold
  order by b.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Profiles: public read, own write
alter table public.profiles enable row level security;
create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Blueprints: approved ones are public, pending only visible to author/admin
alter table public.blueprints enable row level security;
create policy "Approved blueprints are public" on public.blueprints
  for select using (status = 'approved' or auth.uid() = author_id);
create policy "Authenticated users can insert" on public.blueprints
  for insert with check (auth.uid() = author_id);
create policy "Authors can update own blueprints" on public.blueprints
  for update using (auth.uid() = author_id);

-- Builds: users see their own
alter table public.builds enable row level security;
create policy "Users see own builds" on public.builds
  for select using (auth.uid() = user_id);
create policy "Authenticated users can insert builds" on public.builds
  for insert with check (auth.uid() = user_id);

-- Credit transactions: users see their own
alter table public.credit_transactions enable row level security;
create policy "Users see own transactions" on public.credit_transactions
  for select using (auth.uid() = user_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Award karma + credits when a blueprint is approved
create or replace function award_upload_karma(blueprint_id uuid)
returns void as $$
declare
  v_author_id uuid;
begin
  select author_id into v_author_id from public.blueprints where id = blueprint_id;
  
  if v_author_id is not null then
    -- Add karma
    update public.profiles
    set karma = karma + 1,
        upload_count = upload_count + 1,
        tier = case
          when karma + 1 >= 5 then 'contributor'
          else tier
        end
    where id = v_author_id;

    -- Add build credits
    insert into public.credit_transactions (user_id, amount, reason, reference_id)
    values (v_author_id, 5, 'upload', blueprint_id);

    update public.profiles
    set build_credits = build_credits + 5
    where id = v_author_id;
  end if;
end;
$$ language plpgsql security definer;

-- Atomically increment build count on a blueprint
create or replace function increment_build_count(bp_id uuid)
returns void as $$
  update public.blueprints set build_count = build_count + 1 where id = bp_id;
$$ language sql security definer;

-- Atomically increment download count on a blueprint
create or replace function increment_download_count(bp_id uuid)
returns void as $$
  update public.blueprints set download_count = download_count + 1 where id = bp_id;
$$ language sql security definer;

-- Deduct a build credit
create or replace function spend_build_credit(p_user_id uuid, p_blueprint_id uuid)
returns boolean as $$
begin
  if (select build_credits from public.profiles where id = p_user_id) <= 0 then
    return false;
  end if;

  update public.profiles set build_credits = build_credits - 1 where id = p_user_id;

  insert into public.credit_transactions (user_id, amount, reason, reference_id)
  values (p_user_id, -1, 'build', p_blueprint_id);

  return true;
end;
$$ language plpgsql security definer;
