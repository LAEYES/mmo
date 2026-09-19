alter table public.players add column if not exists npc_memories jsonb not null default '[]'::jsonb;
