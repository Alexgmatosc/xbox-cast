'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Tv, Play, AlertCircle, Wifi } from 'lucide-react';
import { useCastStore } from '@/store/useCastStore';
import { useWebRTC } from '@/hooks/useWebRTC';
import { TVSafeLayout } from '@/components/TVSafeLayout';
import { PinInput } from '@/components/PinInput';
import { VideoPlayer } from '@/components/VideoPlayer';
import { DebugPanel } from '@/components/DebugPanel';

function TVContent() {
  const searchParams = useSearchParams();
  const initialRoom = searchParams.get('room') || '';

  const {
    roomId,
    setRoomId,
    setRole,
    connectionState,
    errorMessage,
    remoteStream,
  } = useCastStore();

  const { startReceiver, stopStreaming } = useWebRTC();
  const [pin, setPin] = useState(initialRoom);

  useEffect(() => {
    setRole('receiver');
    if (initialRoom) {
      setPin(initialRoom);
      setRoomId(initialRoom);
    }
  }, [initialRoom, setRole, setRoomId]);

  const handleConnect = async (targetPin?: string) => {
    const code = (targetPin || pin).trim();
    if (!code) return;

    setRoomId(code);

    // Intentar solicitar pantalla completa al pulsar el botón (gesto de usuario válido en consola)
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn('[TV] Pantalla completa rechazada o no permitida:', e);
    }

    await startReceiver(code);
  };

  // Si ya estamos conectados y recibiendo stream, mostrar reproductor a pantalla completa
  if (connectionState === 'connected' && remoteStream) {
    return <VideoPlayer stream={remoteStream} onDisconnect={stopStreaming} />;
  }

  return (
    <TVSafeLayout isTV={true} className="flex flex-col justify-between py-6">
      {/* Barra superior */}
      <header className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <Link
          href="/"
          className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-semibold">Volver al inicio</span>
        </Link>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300">
          <Tv className="w-4 h-4 text-xbox-green" />
          <span>Modo TV (Xbox Edge)</span>
        </div>
      </header>

      {/* Mensaje de Error si ocurre */}
      {errorMessage && (
        <div className="my-4 max-w-xl mx-auto p-4 rounded-2xl bg-red-950/70 border border-red-800 text-red-200 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Contenido Central: Introducción de PIN */}
      <main className="my-auto flex flex-col items-center justify-center text-center max-w-xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-3">
            Conectar con tu Mac
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base">
            Introduce el código PIN de 4 dígitos generado en la pantalla de tu Mac.
          </p>
        </div>

        {/* Componente de entrada PIN para mando y teclado */}
        <div className="mb-8 w-full flex justify-center">
          <PinInput
            value={pin}
            onChange={(val) => {
              setPin(val);
              setRoomId(val);
            }}
            length={4}
            onComplete={(fullPin) => handleConnect(fullPin)}
          />
        </div>

        {/* Botón de Conexión */}
        <button
          type="button"
          disabled={pin.length < 4 || connectionState === 'connecting'}
          onClick={() => handleConnect()}
          className="w-full max-w-xs py-4 px-6 rounded-2xl bg-xbox-green hover:bg-xbox-lightGreen active:bg-xbox-darkGreen text-white font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-xbox-green/20 transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          {connectionState === 'connecting' ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Conectando...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Conectar y Ver</span>
            </>
          )}
        </button>

        {connectionState === 'connecting' && (
          <p className="mt-4 text-xs text-amber-400 animate-pulse flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5" />
            Esperando transmisión del Mac...
          </p>
        )}
      </main>

      {/* Indicaciones para mando de Xbox */}
      <footer className="text-center text-xs text-zinc-500 border-t border-zinc-900 pt-6">
        <span>Consejo: Usa el D-Pad del mando para navegar entre las teclas y pulsa </span>
        <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs">A</kbd>
        <span> para seleccionar.</span>
      </footer>

      <DebugPanel />
    </TVSafeLayout>
  );
}

export default function TVPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-white">
          Cargando Xbox Cast...
        </div>
      }
    >
      <TVContent />
    </Suspense>
  );
}
