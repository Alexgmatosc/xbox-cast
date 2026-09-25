import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { SignalMessage, SignalType, SignalingClient } from './types';
import { deriveKeyFromPin, encryptPayload, decryptPayload } from '../crypto';

export class SupabaseSignaling implements SignalingClient {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private listeners: Map<SignalType, Set<(payload: any) => void>> = new Map();
  private roomId: string = '';
  private role: 'sender' | 'receiver' = 'sender';
  private connected: boolean = false;
  private cryptoKey: CryptoKey | null = null;

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

    this.roomId = roomId.trim().toUpperCase();
    this.role = role;

    // Derivar clave de cifrado E2EE a partir del PIN de la sala
    try {
      this.cryptoKey = await deriveKeyFromPin(this.roomId, this.roomId);
    } catch (e) {
      console.warn('[Supabase Signaling] No se pudo inicializar clave E2EE:', e);
    }

    this.client = createClient(this.supabaseUrl, this.supabaseAnonKey);

    return new Promise((resolve, reject) => {
      try {
        const channelName = `cast-room-${this.roomId}`;
        this.channel = this.client!.channel(channelName, {
          config: { broadcast: { self: false } },
        });

        // Suscribirse a mensajes de señalización broadcast cifrados
        this.channel
          .on('broadcast', { event: 'signal' }, async ({ payload }: { payload: any }) => {
            if (payload && payload.roomId === this.roomId) {
              let decryptedPayload = payload.payload;

              // Si el payload viene cifrado con E2EE, descifrarlo
              if (payload.encrypted && this.cryptoKey) {
                try {
                  decryptedPayload = await decryptPayload(this.cryptoKey, payload.payload);
                } catch (err) {
                  console.error('[Supabase E2EE] Error al descifrar mensaje (PIN incorrecto o clave alterada):', err);
                  const errorHandlers = this.listeners.get('client-error') || this.listeners.get('error');
                  if (errorHandlers) {
                    errorHandlers.forEach((h) => h({ message: 'Clave E2EE incorrecta o PIN erróneo' }));
                  }
                  return;
                }
              } else if (payload.encrypted && !this.cryptoKey) {
                console.error('[Supabase E2EE] Mensaje cifrado recibido pero no hay clave E2EE en este navegador');
                const errorHandlers = this.listeners.get('client-error') || this.listeners.get('error');
                if (errorHandlers) {
                  errorHandlers.forEach((h) =>
                    h({ message: 'Se requiere conexión segura HTTPS para descifrar E2EE' })
                  );
                }
                return;
              }

              const handlers = this.listeners.get(payload.type);
              if (handlers) {
                handlers.forEach((h) => h(decryptedPayload));
              }
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              this.connected = true;
              console.log(`[Supabase Signaling] Conectado al canal ${channelName} con E2EE activo`);
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

  public async send(type: SignalType, payload?: any): Promise<void> {
    if (!this.channel || !this.connected) {
      console.warn(`[Supabase Signaling] No se puede enviar ${type}: canal no suscrito`);
      return;
    }

    let outgoingPayload = payload;
    let isEncrypted = false;

    // Cifrar con AES-GCM 256 mensajes sensibles (SDP y candidatos ICE)
    if (this.cryptoKey && (type === 'offer' || type === 'answer' || type === 'candidate')) {
      try {
        outgoingPayload = await encryptPayload(this.cryptoKey, payload);
        isEncrypted = true;
      } catch (e) {
        console.warn('[Supabase E2EE] Error cifrando mensaje, enviando sin cifrar:', e);
      }
    }

    const message = {
      type,
      roomId: this.roomId,
      role: this.role,
      encrypted: isEncrypted,
      payload: outgoingPayload,
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
    this.cryptoKey = null;
    this.listeners.clear();
  }

  public isConnected(): boolean {
    return this.connected;
  }
}
