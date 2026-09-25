import React from 'react';
import { ConnectionStatus } from '@/store/useCastStore';
import { Wifi, WifiOff, Activity } from 'lucide-react';

interface ConnectionBadgeProps {
  status: ConnectionStatus;
  stats?: {
    fps: number;
    latencyMs: number;
    resolution: string;
  };
  className?: string;
}

export function ConnectionBadge({ status, stats, className = '' }: ConnectionBadgeProps) {
  const getBadgeDetails = () => {
    switch (status) {
      case 'connected':
        return {
          bg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
          dot: 'bg-emerald-400',
          text: 'Conectado (P2P)',
          icon: Wifi,
        };
      case 'connecting':
        return {
          bg: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
          dot: 'bg-amber-400 animate-ping',
          text: 'Conectando...',
          icon: Activity,
        };
      case 'error':
        return {
          bg: 'bg-red-950/80 border-red-500/50 text-red-300',
          dot: 'bg-red-400',
          text: 'Error de conexión',
          icon: WifiOff,
        };
      case 'disconnected':
      default:
        return {
          bg: 'bg-zinc-900/80 border-zinc-700/50 text-zinc-400',
          dot: 'bg-zinc-500',
          text: 'Desconectado',
          icon: WifiOff,
        };
    }
  };

  const details = getBadgeDetails();
  const Icon = details.icon;

  return (
    <div
      className={`inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full border backdrop-blur-md text-xs sm:text-sm font-medium transition-all ${details.bg} ${className}`}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className={`inline-flex rounded-full h-2.5 w-2.5 ${details.dot}`} />
      </span>
      <Icon className="w-4 h-4 opacity-80" />
      <span>{details.text}</span>

      {status === 'connected' && stats && (
        <div className="flex items-center gap-2 border-l border-emerald-500/30 pl-2 text-xs text-emerald-400/90 font-mono">
          <span>{stats.resolution}</span>
          <span>•</span>
          <span>{stats.fps} FPS</span>
          {stats.latencyMs > 0 && (
            <>
              <span>•</span>
              <span>{stats.latencyMs}ms</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
