import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { SignalMessage, SignalType, SignalingClient } from './types';

export class SupabaseSignaling implements SignalingClient {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private listeners: Map<SignalType, Set<(payload: any) => void>> = new Map();
  private roomId: string = '';
  private role: 'sender' | 'receiver' = 'sender';
  private connected: boolean = false;

  constructor(
    private supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    private supabaseAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  ) {}

  public async connect(roomId: string, role: 'sender' | 'receiver'): Promise<void> {
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      throw new Error(
        'Supabase URL y Anon Key no están configuradas en las variables de entorno.'
      );
    }

    this.roomId = roomId;
    this.role = role;
    this.client = createClient(this.supabaseUrl, this.supabaseAnonKey);

    return new Promise((resolve, reject) => {
      try {
        const channelName = `cast-room-${roomId}`;
        this.channel = this.client!.channel(channelName, {
          config: { broadcast: { self: false } },
        });

        // Suscribirse a mensajes de señalización broadcast
        this.channel
          .on('broadcast', { event: 'signal' }, ({ payload }: { payload: SignalMessage }) => {
            if (payload && payload.roomId === this.roomId) {
              const handlers = this.listeners.get(payload.type);
              if (handlers) {
                handlers.forEach((h) => h(payload.payload));
              }
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              this.connected = true;
              console.log(`[Supabase Signaling] Conectado al canal ${channelName}`);
              // Notificar que se ha unido a la sala
              this.send('join', { role: this.role });
              resolve();
            } else if (status === 'CHANNEL_ERROR') {
              reject(new Error(`Error al suscribirse al canal Supabase ${channelName}`));
            }
          });
      } catch (err) {
        reject(err);
      }
    });
  }

  public send(type: SignalType, payload?: any): void {
    if (!this.channel || !this.connected) {
      console.warn(`[Supabase Signaling] No se puede enviar ${type}: canal no suscrito`);
      return;
    }

    const message: SignalMessage = {
      type,
      roomId: this.roomId,
      role: this.role,
      payload,
    };

    this.channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: message,
    });
  }

  public on(type: SignalType, handler: (payload: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);

    return () => {
      this.listeners.get(type)?.delete(handler);
    };
  }

  public disconnect(): void {
    if (this.channel && this.client) {
      this.channel.unsubscribe();
      this.client.removeChannel(this.channel);
      this.channel = null;
    }
    this.connected = false;
    this.listeners.clear();
  }

  public isConnected(): boolean {
    return this.connected;
  }
}
