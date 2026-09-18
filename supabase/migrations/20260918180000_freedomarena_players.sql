create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  level integer not null default 1,
  xp integer not null default 0,
  faction text not null default 'Aegis',
  victories integer not null default 0,
  zone_id text not null default 'outpost',
  exploration_count integer not null default 0,
  last_discovery text not null default '',
  arena_wins integer not null default 0,
  equipped_card_id text,
  fusion_materials integer not null default 0,
  world_threat integer not null default 1,
  world_resources integer not null default 0,
  world_tile jsonb not null default '{"x":0,"y":0}'::jsonb,
  visited_poi_ids jsonb not null default '[]'::jsonb,
  faction_states jsonb not null default '[]'::jsonb,
  quests jsonb not null default '[]'::jsonb,
  cards jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.players enable row level security;

create policy "players_select_own" on public.players
  for select using (auth.uid() = id);
create policy "players_insert_own" on public.players
  for insert with check (auth.uid() = id);
create policy "players_update_own" on public.players
  for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists players_updated_at on public.players;
create trigger players_updated_at before update on public.players
for each row execute function public.set_updated_at();
