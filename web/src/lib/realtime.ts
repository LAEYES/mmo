import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { WorldTilePosition } from '../game';

export type ZonePresence = {
  playerId: string;
  name: string;
  zoneId: string;
  worldTile: WorldTilePosition;
  faction: string;
  updatedAt: number;
};

export type ZonePresenceCallbacks = {
  onSync?: (players: ZonePresence[]) => void;
  onJoin?: (player: ZonePresence) => void;
  onLeave?: (playerId: string) => void;
  onUpdate?: (player: ZonePresence) => void;
};

function isZonePresence(value: unknown): value is ZonePresence {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ZonePresence>;
  return typeof item.playerId === 'string' && typeof item.name === 'string' && typeof item.zoneId === 'string' && typeof item.faction === 'string' && typeof item.updatedAt === 'number' && Boolean(item.worldTile) && typeof item.worldTile?.x === 'number' && typeof item.worldTile?.y === 'number';
}

function topic(zoneId: string) {
  return 'freedomarena:zone:' + zoneId;
}

export async function joinZonePresence(
  zoneId: string,
  player: ZonePresence,
  callbacks: ZonePresenceCallbacks = {},
): Promise<{ channel: RealtimeChannel | null; stop: () => Promise<void> }> {
  if (!supabase) return { channel: null, stop: async () => {} };

  const channel = supabase.channel(topic(zoneId), {
    config: { presence: { key: player.playerId } },
  });

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState<ZonePresence>();
    const players = Object.values(state).flatMap(entries => entries.filter(isZonePresence));
    callbacks.onSync?.(players);
  });

  channel.on('presence', { event: 'join' }, ({ newPresences }) => {
    for (const entry of newPresences) if (isZonePresence(entry)) callbacks.onJoin?.(entry);
  });

  channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
    for (const entry of leftPresences) if (isZonePresence(entry)) callbacks.onLeave?.(entry.playerId);
  });

  await channel.subscribe(async status => {
    if (status === 'SUBSCRIBED') await channel.track(player);
  });

  return {
    channel,
    stop: async () => {
      await channel.untrack();
      if (supabase) await supabase.removeChannel(channel);
    },
  };
}

export async function updateZonePresence(channel: RealtimeChannel | null, player: ZonePresence) {
  if (!channel) return;
  await channel.track(player);
}
