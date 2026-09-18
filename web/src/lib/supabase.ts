import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;
export const isSupabaseConfigured = Boolean(supabase);

export async function savePlayerRemote(playerId: string, player: Record<string, unknown>) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured') };
  return supabase.from('players').upsert({ id: playerId, ...player });
}

export async function loadPlayerRemote(playerId: string) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured') };
  return supabase.from('players').select('*').eq('id', playerId).maybeSingle();
}
