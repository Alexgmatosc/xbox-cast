'use client';

import React, { useState, useEffect } from 'react';
import { useCastStore } from '@/store/useCastStore';
import { Terminal, ChevronDown, ChevronUp } from 'lucide-react';

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const { role, roomId, connectionState, iceState, signalingState, logs } = useCastStore();

  useEffect(() => {
    // Solo mostrar si se activa explícitamente por variable de entorno o flag en URL (?debug=true)
    const envDebug = process.env.NEXT_PUBLIC_DEBUG === 'true';
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const queryDebug = urlParams?.get('debug') === 'true' || urlParams?.get('debug') === '1';
    const localDebug = typeof window !== 'undefined' && window.localStorage.getItem('debug') === 'true';

    setShowDebug(Boolean(envDebug || queryDebug || localDebug));
  }, []);

  if (!showDebug) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full pointer-events-auto">
      <div className="bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-xs font-mono">
        {/* Barra de cabecera */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2.5 bg-zinc-900/90 hover:bg-zinc-800 flex items-center justify-between text-zinc-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-xbox-green" />
            <span className="font-semibold text-white uppercase tracking-wider">
              Diagnóstico WebRTC ({role || 'sin rol'})
            </span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px]">
              ICE: {iceState}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px]">
              SIG: {signalingState}
            </span>
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </button>

        {/* Panel expandido */}
        {isOpen && (
          <div className="p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2 text-zinc-400 border-b border-zinc-800 pb-2">
              <div>
                <span className="text-zinc-500">Sala: </span>
                <span className="text-white font-bold">{roomId || 'N/A'}</span>
              </div>
              <div>
                <span className="text-zinc-500">Estado Conexión: </span>
                <span className="text-white font-bold">{connectionState}</span>
              </div>
              <div>
                <span className="text-zinc-500">ICE Connection: </span>
                <span className="text-white">{iceState}</span>
              </div>
              <div>
                <span className="text-zinc-500">Signaling State: </span>
                <span className="text-white">{signalingState}</span>
              </div>
            </div>

            <div>
              <div className="text-zinc-500 mb-1 font-semibold">Registro de Eventos:</div>
              <div className="max-h-36 overflow-y-auto space-y-1 bg-black/60 p-2.5 rounded-xl border border-zinc-900 select-text">
                {logs.length === 0 ? (
                  <div className="text-zinc-600 italic">Esperando eventos...</div>
                ) : (
                  logs.map((log, i) => (
                    <div
                      key={i}
                      className={`leading-relaxed text-[11px] ${
                        log.includes('Error') || log.includes('error')
                          ? 'text-red-400'
                          : log.includes('conectado') || log.includes('éxito')
                          ? 'text-emerald-400'
                          : 'text-zinc-400'
                      }`}
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
