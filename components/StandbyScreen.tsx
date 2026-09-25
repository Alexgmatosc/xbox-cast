'use client';

import React from 'react';
import { Tv, Wifi, PauseCircle, LogOut } from 'lucide-react';
import { ConnectionBadge } from './ConnectionBadge';
import { useCastStore } from '@/store/useCastStore';

interface StandbyScreenProps {
  onDisconnect?: () => void;
  isTV?: boolean;
}

export function StandbyScreen({ onDisconnect, isTV = false }: StandbyScreenProps) {
  const { roomId, stats, connectionState } = useCastStore();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Barra superior */}
      <header className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xbox-green">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white leading-tight">
              Xbox Cast
            </h1>
            <span className="text-xs text-zinc-400">
              Sala: <strong className="font-mono text-zinc-200">{roomId}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ConnectionBadge status={connectionState} stats={stats} />
          {onDisconnect && (
            <button
              type="button"
              onClick={onDisconnect}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Desconectar</span>
            </button>
          )}
        </div>
      </header>

      {/* Contenido Central: Estado en Reposo */}
      <main className="my-auto flex flex-col items-center justify-center text-center max-w-lg mx-auto w-full">
        {/* Radar / Animación de conexión */}
        <div className="relative mb-8 flex items-center justify-center">
          <div className="absolute w-36 h-36 rounded-full bg-xbox-green/10 animate-ping opacity-40 pointer-events-none" />
          <div className="absolute w-28 h-28 rounded-full bg-xbox-green/20 animate-pulse pointer-events-none" />
          <div className="w-20 h-20 rounded-3xl bg-zinc-900 border-2 border-xbox-green/50 flex items-center justify-center text-xbox-green shadow-xl shadow-xbox-green/20">
            <Wifi className="w-9 h-9 animate-pulse" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-800/80 text-emerald-400 text-xs font-medium mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Conexión P2P Establecida</span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
          Transmisión en Espera
        </h2>

        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed mb-6">
          Tu dispositivo está emparejado y listo. La imagen comenzará automáticamente en cuanto el anfitrión pulse{' '}
          <strong className="text-white">&quot;Iniciar Transmisión&quot;</strong> en su ordenador.
        </p>

        <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-950/80 px-4 py-2.5 rounded-2xl border border-zinc-800/80">
          <PauseCircle className="w-4 h-4 text-zinc-400" />
          <span>La sesión permanece activa sin desconectarse.</span>
        </div>
      </main>

      {/* Pie con indicaciones de mando si es TV */}
      {isTV && (
        <footer className="text-center text-xs text-zinc-500 border-t border-zinc-900 pt-6">
          <span>Pulsa </span>
          <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs">B</kbd>
          <span> en el mando para desconectar o salir.</span>
        </footer>
      )}
    </div>
  );
}
