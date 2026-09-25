import { SignalMessage, SignalType, SignalingClient } from './types';

export class LocalWebSocketSignaling implements SignalingClient {
  private ws: WebSocket | null = null;
  private listeners: Map<SignalType, Set<(payload: any) => void>> = new Map();
  private roomId: string = '';
  private role: 'sender' | 'receiver' = 'sender';
  private connected: boolean = false;
  private reconnectTimeout: any = null;

  constructor(private port: number = 3001) {}

  public connect(roomId: string, role: 'sender' | 'receiver'): Promise<void> {
    this.roomId = roomId;
    this.role = role;

    return new Promise((resolve, reject) => {
      try {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${hostname}:${this.port}`;

        console.log(`[Signaling Client] Conectando a ${url} (sala: ${roomId}, rol: ${role})`);
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.connected = true;
          console.log('[Signaling Client] Conectado al servidor WebSocket');
          // Join room immediately
          this.ws?.send(
            JSON.stringify({
              type: 'join',
              roomId: this.roomId,
              role: this.role,
            })
          );
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data: SignalMessage = JSON.parse(event.data);
            const { type, payload } = data;
            const handlers = this.listeners.get(type);
            if (handlers) {
              handlers.forEach((h) => h(payload));
            }
          } catch (e) {
            console.error('[Signaling Client] Error parseando mensaje:', e);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[Signaling Client] Error de WebSocket:', error);
          if (!this.connected) {
            reject(error);
          }
        };

        this.ws.onclose = () => {
          this.connected = false;
          console.log('[Signaling Client] Desconectado del servidor WebSocket');
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  public send(type: SignalType, payload?: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[Signaling Client] No se puede enviar ${type}: WebSocket no está abierto`);
      return;
    }

    const message: SignalMessage = {
      type,
      roomId: this.roomId,
      role: this.role,
      payload,
    };

    this.ws.send(JSON.stringify(message));
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
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.listeners.clear();
  }

  public isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }
}
