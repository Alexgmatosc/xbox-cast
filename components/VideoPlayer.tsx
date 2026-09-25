'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Maximize2, Minimize2, Volume2, VolumeX, LogOut, Info } from 'lucide-react';
import { ConnectionBadge } from './ConnectionBadge';
import { useCastStore } from '@/store/useCastStore';
import { DebugPanel } from './DebugPanel';

interface VideoPlayerProps {
  stream: MediaStream | null;
  onDisconnect?: () => void;
}

export function VideoPlayer({ stream, onDisconnect }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const hideHudTimer = useRef<any>(null);

  const { connectionState, stats } = useCastStore();

  // Asignar el MediaStream al elemento <video>
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current
        .play()
        .catch((err) => console.warn('[VideoPlayer] Autoplay bloqueado hasta interacción:', err));
    }
  }, [stream]);

  // Manejo de temporizador para ocultar la barra de controles (HUD) tras inactividad
  const resetHudTimer = useCallback(() => {
    setShowHud(true);
    if (hideHudTimer.current) clearTimeout(hideHudTimer.current);

    hideHudTimer.current = setTimeout(() => {
      setShowHud(false);
    }, 3500);
  }, []);

  useEffect(() => {
    resetHudTimer();

    const handleActivity = () => resetHudTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      if (hideHudTimer.current) clearTimeout(hideHudTimer.current);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [resetHudTimer]);

  // Alternar pantalla completa
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.warn('[VideoPlayer] Error al cambiar pantalla completa:', err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      onClick={resetHudTimer}
      className="relative w-screen h-screen bg-black overflow-hidden flex items-center justify-center cursor-none hover:cursor-default"
      style={{ userSelect: 'none' }}
    >
      {/* Elemento de vídeo con máxima aceleración */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        controls={false}
        className="w-full h-full object-contain bg-black"
      />

      {/* Si no hay vídeo recibido aún, mostrar mensaje de espera */}
      {!stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-zinc-400 gap-4">
          <div className="w-12 h-12 border-4 border-xbox-green border-t-transparent rounded-full animate-spin" />
          <p className="text-xl font-medium text-white">Esperando señal de vídeo del Mac...</p>
          <p className="text-sm text-zinc-500">Asegúrate de haber seleccionado una pantalla en el emisor.</p>
        </div>
      )}

      {/* HUD (Barra de estado e interactividad auto-ocultable) */}
      <div
        className={`absolute top-0 left-0 right-0 p-6 md:p-8 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 pointer-events-none ${
          showHud ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="pointer-events-auto">
          <ConnectionBadge status={connectionState} stats={stats} />
        </div>

        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Botón Silenciar / Activar sonido */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="p-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700 backdrop-blur-md transition-all focus:ring-2 focus:ring-xbox-green"
            title={isMuted ? 'Activar sonido' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* Botón Pantalla Completa */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-3 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white border border-zinc-700 backdrop-blur-md transition-all focus:ring-2 focus:ring-xbox-green"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          {/* Botón Desconectar */}
          {onDisconnect && (
            <button
              type="button"
              onClick={onDisconnect}
              className="p-3 rounded-full bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 backdrop-blur-md transition-all focus:ring-2 focus:ring-red-500"
              title="Desconectar"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <DebugPanel />
    </div>
  );
}
