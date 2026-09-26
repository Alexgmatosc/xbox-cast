'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Tv,
  Play,
  AlertCircle,
  Wifi,
  Clock,
  ShieldCheck,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { useCastStore } from '@/store/useCastStore';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useDevice } from '@/hooks/useDevice';
import { TVSafeLayout } from '@/components/TVSafeLayout';
import { PinInput } from '@/components/PinInput';
import { VideoPlayer } from '@/components/VideoPlayer';
import { StandbyScreen } from '@/components/StandbyScreen';
import { DebugPanel } from '@/components/DebugPanel';

function TVContent() {
  const searchParams = useSearchParams();
  const initialRoom = searchParams.get('room') || '';
  const { isMobile, isXbox, isTV, name } = useDevice();

  const {
    roomId,
    setRoomId,
    setRole,
    connectionState,
    errorMessage,
    remoteStream,
    isStreamingActive,
  } = useCastStore();

  const { startReceiver, stopStreaming } = useWebRTC();
  const [pin, setPin] = useState(initialRoom);
  const [attempts, setAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Contador regresivo para bloqueo tras 3 intentos fallidos (seguridad anti fuerza bruta)
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Si ocurre un error, contabilizar intento fallido
  useEffect(() => {
    if (errorMessage) {
      setAttempts((prev) => {
        const next = prev + 1;
        if (next >= 3) {
          setLockoutSeconds(30);
        }
        return next;
      });
    }
  }, [errorMessage]);

  useEffect(() => {
    setRole('receiver');
    if (initialRoom) {
      setPin(initialRoom);
      setRoomId(initialRoom);
    }
  }, [initialRoom, setRole, setRoomId]);

  const handleConnect = async (targetPin?: string) => {
    if (lockoutSeconds > 0) return;
    const code = (targetPin || pin).trim();
    if (!code || code.length < 6) return;

    setRoomId(code);

    // Intentar solicitar pantalla completa al pulsar el botón (gesto de usuario válido en consola/móvil)
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn('[TV] Pantalla completa rechazada o no permitida:', e);
    }

    await startReceiver(code);
  };

  // Si ya estamos conectados P2P:
  // - Si el anfitrión está transmitiendo vídeo activamente, mostrar reproductor a pantalla completa
  // - Si está en espera o pausado, mostrar la pantalla de Standby sin perder la conexión
  if (connectionState === 'connected') {
    if (isStreamingActive && remoteStream) {
      return <VideoPlayer stream={remoteStream} onDisconnect={stopStreaming} />;
    }
    return <StandbyScreen onDisconnect={stopStreaming} isTV={isXbox || isTV} />;
  }

  return (
    <TVSafeLayout isTV={isXbox || isTV} className="flex flex-col justify-between py-6 min-h-screen">
      {/* Barra superior */}
      <header className="flex-shrink-0 flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <Link
          href="/"
          className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-semibold hidden sm:inline">Volver</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-xs font-medium text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>E2EE 256-bit</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300">
            {isXbox ? (
              <>
                <Tv className="w-4 h-4 text-xbox-green" />
                <span>Modo TV (Xbox Edge)</span>
              </>
            ) : isMobile ? (
              <>
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>{name}</span>
              </>
            ) : (
              <>
                <Monitor className="w-4 h-4 text-blue-400" />
                <span>{name}</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Alerta de bloqueo por intentos fallidos */}
      {lockoutSeconds > 0 && (
        <div className="my-4 max-w-xl mx-auto p-4 rounded-2xl bg-amber-950/80 border border-amber-700/80 text-amber-200 flex items-center gap-3 text-sm">
          <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />
          <span>
            Bloqueo de seguridad activo. Espera{' '}
            <strong className="font-mono text-white text-base">{lockoutSeconds}s</strong> antes de
            introducir otro PIN.
          </span>
        </div>
      )}

      {/* Mensaje de Error si ocurre */}
      {errorMessage && lockoutSeconds <= 0 && (
        <div className="my-4 max-w-xl mx-auto p-4 rounded-2xl bg-red-950/70 border border-red-800 text-red-200 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Contenido Central: Introducción de PIN */}
      <main className="my-auto flex flex-col items-center justify-center text-center max-w-xl mx-auto w-full py-4">
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-3">
            Conectar con tu Pantalla
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base">
            {isMobile
              ? 'Introduce el código PIN de 6 dígitos que aparece en tu ordenador.'
              : 'Introduce el código PIN de 6 dígitos generado en la pantalla de tu Mac o PC.'}
          </p>
        </div>

        {/* Componente de entrada PIN para mando, pantalla táctil y teclado */}
        <div className="mb-8 w-full flex justify-center">
          <PinInput
            value={pin}
            onChange={(val) => {
              setPin(val);
              setRoomId(val);
            }}
            length={6}
            disabled={lockoutSeconds > 0 || connectionState === 'connecting'}
            onComplete={(fullPin) => handleConnect(fullPin)}
          />
        </div>

        {/* Botón de Conexión */}
        <button
          type="button"
          disabled={pin.length < 6 || connectionState === 'connecting' || lockoutSeconds > 0}
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
            Esperando confirmación del emisor...
          </p>
        )}
      </main>

      {/* Indicaciones dinámicas según dispositivo */}
      <footer className="flex-shrink-0 text-center text-xs text-zinc-500 border-t border-zinc-900 pt-6 mt-4">
        {isXbox ? (
          <>
            <span>Consejo: Usa el D-Pad del mando para navegar entre las teclas y pulsa </span>
            <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-xs">A</kbd>
            <span> para seleccionar.</span>
          </>
        ) : isMobile ? (
          <span>Pulsa las casillas o usa el teclado numérico en pantalla para introducir el PIN.</span>
        ) : (
          <span>Introduce los 6 dígitos usando tu teclado o el ratón.</span>
        )}
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
