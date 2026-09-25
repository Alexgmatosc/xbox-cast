import { create } from 'zustand';

export type CastRole = 'sender' | 'receiver' | null;
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface CastState {
  role: CastRole;
  roomId: string;
  connectionState: ConnectionStatus;
  iceState: string;
  signalingState: string;
  errorMessage: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  peerConnected: boolean;
  stats: {
    fps: number;
    latencyMs: number;
    resolution: string;
  };
  logs: string[];

  setRole: (role: CastRole) => void;
  setRoomId: (roomId: string) => void;
  setConnectionState: (status: ConnectionStatus) => void;
  setIceState: (iceState: string) => void;
  setSignalingState: (signalingState: string) => void;
  setErrorMessage: (msg: string | null) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setIsMuted: (muted: boolean) => void;
  setPeerConnected: (connected: boolean) => void;
  setStats: (stats: Partial<CastState['stats']>) => void;
  addLog: (msg: string) => void;
  reset: () => void;
}

const initialState = {
  role: null as CastRole,
  roomId: '',
  connectionState: 'disconnected' as ConnectionStatus,
  iceState: 'new',
  signalingState: 'stable',
  errorMessage: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  peerConnected: false,
  stats: {
    fps: 0,
    latencyMs: 0,
    resolution: '1080p',
  },
  logs: [] as string[],
};

export const useCastStore = create<CastState>((set) => ({
  ...initialState,

  setRole: (role) => set({ role }),
  setRoomId: (roomId) => set({ roomId: roomId.toUpperCase().trim() }),
  setConnectionState: (connectionState) => set({ connectionState }),
  setIceState: (iceState) => set({ iceState }),
  setSignalingState: (signalingState) => set({ signalingState }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setIsMuted: (isMuted) => set({ isMuted }),
  setPeerConnected: (peerConnected) => set({ peerConnected }),
  setStats: (newStats) =>
    set((state) => ({ stats: { ...state.stats, ...newStats } })),
  addLog: (msg) =>
    set((state) => {
      const timestamp = new Date().toLocaleTimeString();
      const newLogs = [`[${timestamp}] ${msg}`, ...state.logs.slice(0, 19)];
      return { logs: newLogs };
    }),
  reset: () =>
    set((state) => {
      if (state.localStream) {
        state.localStream.getTracks().forEach((track) => track.stop());
      }
      return { ...initialState };
    }),
}));
