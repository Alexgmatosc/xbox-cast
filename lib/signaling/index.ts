import { LocalWebSocketSignaling } from './local-ws';
import { SupabaseSignaling } from './supabase';
import { SignalingClient } from './types';

export function createSignalingClient(): SignalingClient {
  const isBrowser = typeof window !== 'undefined';
  const hostname = isBrowser ? window.location.hostname : 'localhost';
  const isLocalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

  const hasSupabase =
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.trim().length > 0 &&
    typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'string' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim().length > 0;

  const forceSupabase = process.env.NEXT_PUBLIC_FORCE_SUPABASE === 'true';

  // Si estamos en un dominio público en la nube (Vercel / HTTPS) con Supabase, usar Supabase Realtime (E2EE)
  if (hasSupabase && (!isLocalHost || forceSupabase)) {
    console.log('[Signaling] Utilizando adaptador Supabase Realtime (E2EE)');
    return new SupabaseSignaling();
  }

  // En red local u offline, usar el servidor WebSocket local ultraligero (:3001)
  const port = Number(process.env.NEXT_PUBLIC_LOCAL_SIGNAL_PORT || 3001);
  console.log(`[Signaling] Utilizando servidor WebSocket local en ${hostname}:${port}`);
  return new LocalWebSocketSignaling(port);
}

export * from './types';
export * from './local-ws';
export * from './supabase';
