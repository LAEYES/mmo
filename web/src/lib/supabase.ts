import { createClient } from '@supabase/supabase-js';
import type { PlayerState } from '../game';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;
export const isSupabaseConfigured = Boolean(supabase);

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
  const { data, error } = await supabase.from('players').upsert({
    id: session.user.id,
    ...player,
  }).select().single();
  return { player: data as PlayerState | null, error };
}

export async function loadOrCreatePlayerRemote(localPlayer: PlayerState) {
  const session = await ensureSession();
  if (!session || !supabase) return { player: null, error: new Error('Supabase anonymous auth is unavailable') };
  const existing = await supabase.from('players').select('*').eq('id', session.user.id).maybeSingle();
  if (existing.error) return { player: null, error: existing.error };
  if (existing.data) return { player: existing.data as PlayerState, error: null };
  const created = await supabase.from('players').upsert({ id: session.user.id, ...localPlayer }).select().single();
  return { player: created.data as PlayerState | null, error: created.error };
}
