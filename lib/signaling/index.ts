import { LocalWebSocketSignaling } from './local-ws';
import { SupabaseSignaling } from './supabase';
import { SignalingClient } from './types';

export function createSignalingClient(): SignalingClient {
  const hasSupabase =
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.trim().length > 0 &&
    typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'string' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim().length > 0;

  if (hasSupabase) {
    console.log('[Signaling] Utilizando adaptador Supabase Realtime');
    return new SupabaseSignaling();
  }

  const port = Number(process.env.NEXT_PUBLIC_LOCAL_SIGNAL_PORT || 3001);
  console.log(`[Signaling] Utilizando servidor WebSocket local en puerto ${port}`);
  return new LocalWebSocketSignaling(port);
}

export * from './types';
export * from './local-ws';
export * from './supabase';
