import { createClient } from '@supabase/supabase-js';
import type { PlayerState } from '../game';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;
export const isSupabaseConfigured = Boolean(supabase);

type PlayerRow = {
  id: string; name: string; level: number; xp: number; faction: PlayerState['faction'];
  victories: number; zone_id: string; exploration_count: number; last_discovery: string;
  arena_wins: number; equipped_card_id: string | null; fusion_materials: number;
  world_threat: number; world_resources: number; world_tile: PlayerState['worldTile'];
  visited_poi_ids: string[]; faction_states: PlayerState['factionStates']; npc_memories: PlayerState['npcMemories'];
  quests: PlayerState['quests']; cards: PlayerState['cards'];
};

function toRemoteRow(player: PlayerState, id: string): PlayerRow {
  return {
    id, name: player.name, level: player.level, xp: player.xp, faction: player.faction,
    victories: player.victories, zone_id: player.zoneId, exploration_count: player.explorationCount,
    last_discovery: player.lastDiscovery, arena_wins: player.arenaWins,
    equipped_card_id: player.equippedCardId, fusion_materials: player.fusionMaterials,
    world_threat: player.worldThreat, world_resources: player.worldResources,
    world_tile: player.worldTile, visited_poi_ids: player.visitedPoiIds,
    faction_states: player.factionStates, npc_memories: player.npcMemories, quests: player.quests, cards: player.cards,
  };
}

function fromRemoteRow(row: PlayerRow): PlayerState {
  const tile = row.world_tile;
  const worldTile = tile && Number.isFinite(tile.x) && Number.isFinite(tile.y)
    ? { x: Math.trunc(tile.x), y: Math.trunc(tile.y) }
    : { x: 0, y: 0 };
  return {
    name: row.name, level: row.level, xp: row.xp, faction: row.faction, victories: row.victories,
    zoneId: row.zone_id, explorationCount: row.exploration_count, lastDiscovery: row.last_discovery,
    arenaWins: row.arena_wins, equippedCardId: row.equipped_card_id,
    fusionMaterials: row.fusion_materials, worldThreat: row.world_threat, worldResources: row.world_resources,
    worldTile, visitedPoiIds: row.visited_poi_ids ?? [],
    factionStates: row.faction_states ?? [], npcMemories: row.npc_memories ?? [], quests: row.quests ?? [], cards: row.cards ?? [],
  };
}

async function ensureSession() {
  if (!supabase) return null;
  const current = await supabase.auth.getSession();
  if (current.data.session) return current.data.session;
  const anonymous = await supabase.auth.signInAnonymously();
  return anonymous.data.session ?? null;
}

export async function syncPlayerRemote(player: PlayerState) {
  const session = await ensureSession();
  if (!session || !supabase) return { player: null, error: new Error('Supabase anonymous auth is unavailable') };
  const { data, error } = await supabase.from('players').upsert(toRemoteRow(player, session.user.id)).select().single();
  return { player: data ? fromRemoteRow(data as PlayerRow) : null, error };
}

export async function loadOrCreatePlayerRemote(localPlayer: PlayerState) {
  const session = await ensureSession();
  if (!session || !supabase) return { player: null, error: new Error('Supabase anonymous auth is unavailable') };
  const existing = await supabase.from('players').select('*').eq('id', session.user.id).maybeSingle();
  if (existing.error) return { player: null, error: existing.error };
  if (existing.data) return { player: fromRemoteRow(existing.data as PlayerRow), error: null };
  const created = await supabase.from('players').upsert(toRemoteRow(localPlayer, session.user.id)).select().single();
  return { player: created.data ? fromRemoteRow(created.data as PlayerRow) : null, error: created.error };
}
