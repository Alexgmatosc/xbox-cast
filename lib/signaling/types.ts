export type SignalType =
  | 'join'
  | 'peer-joined'
  | 'peer-left'
  | 'request-offer'
  | 'offer'
  | 'answer'
  | 'candidate'
  | 'sender-ready'
  | 'stream-status'
  | 'viewer-info'
  | 'telemetry'
  | 'client-error'
  | 'error';

export interface SignalMessage {
  type: SignalType;
  roomId: string;
  role?: 'sender' | 'receiver' | 'guest';
  payload?: any;
}

export interface SignalingClient {
  connect(roomId: string, role: 'sender' | 'receiver'): Promise<void>;
  send(type: SignalType, payload?: any): void;
  on(type: SignalType, handler: (payload: any) => void): () => void;
  disconnect(): void;
  isConnected(): boolean;
}
