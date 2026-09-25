'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Cast,
  ArrowLeft,
  Tv,
  Settings2,
  StopCircle,
  Play,
  Copy,
  Check,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import { useCastStore } from '@/store/useCastStore';
import { useWebRTC } from '@/hooks/useWebRTC';
import { ConnectionBadge } from '@/components/ConnectionBadge';
import { TVSafeLayout } from '@/components/TVSafeLayout';
import { DebugPanel } from '@/components/DebugPanel';

export default function CastPage() {
  const {
    roomId,
    setRoomId,
    setRole,
    connectionState,
    errorMessage,
    localStream,
    stats,
  } = useCastStore();

  const { startSender, stopStreaming } = useWebRTC();

  const [copied, setCopied] = useState(false);
  const [localIp, setLocalIp] = useState('localhost');
  const [fps, setFps] = useState<number>(60);
  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  // Generar un PIN aleatorio de 4 dígitos si no hay uno
  useEffect(() => {
    setRole('sender');
    if (!roomId) {
      const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
      setRoomId(generatedPin);
    }

    // Obtener IP del Mac
    fetch('/api/ip')
      .then((res) => res.json())
      .then((data) => {
        if (data.primaryIp) setLocalIp(data.primaryIp);
      })
      .catch(() => {});
  }, [roomId, setRole, setRoomId]);

  // Actualizar preview de vídeo local
  useEffect(() => {
    if (previewVideoRef.current && localStream) {
      previewVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const xboxUrl = `http://${localIp}:3000/tv?room=${roomId}`;

  const copyToClipboard = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(xboxUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartCast = async () => {
    await startSender(roomId, { fps, resolution });
  };

  const handleStopCast = () => {
    stopStreaming();
  };

  const isStreaming = !!localStream;

  return (
    <TVSafeLayout className="py-8">
      {/* Barra superior de navegación */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-5 mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            onClick={stopStreaming}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Cast className="w-6 h-6 text-xbox-green" />
              Emitir Pantalla (Mac)
            </h1>
            <p className="text-xs text-zinc-400">Transmite audio y vídeo a tu Xbox en red local</p>
          </div>
        </div>

        <ConnectionBadge status={connectionState} stats={stats} />
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-sm">{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Columna Izquierda: Controles y PIN de conexión */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Tarjeta de PIN y Enlace para Xbox */}
          <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex flex-col gap-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Tv className="w-4 h-4 text-xbox-green" />
              Código de Conexión en Xbox
            </h2>

            <div className="flex flex-col items-center justify-center p-6 bg-black/60 rounded-2xl border border-zinc-800">
              <span className="text-xs text-zinc-500 mb-1">CÓDIGO PIN (4 DÍGITOS)</span>
              <span className="font-mono text-5xl font-black tracking-widest text-white">
                {roomId}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-zinc-400 font-medium">
                URL directa para Microsoft Edge en Xbox:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={xboxUrl}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-300 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors flex-shrink-0"
                  title="Copiar URL"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Ajustes de Calidad */}
          <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-zinc-400" />
              Ajustes de Calidad
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Resolución</label>
                <select
                  disabled={isStreaming}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as '1080p' | '720p')}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:border-xbox-green focus:outline-none disabled:opacity-50"
                >
                  <option value="1080p">1080p Full HD (Recomendado)</option>
                  <option value="720p">720p HD (Menor ancho de banda)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Fotogramas (FPS)</label>
                <select
                  disabled={isStreaming}
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:border-xbox-green focus:outline-none disabled:opacity-50"
                >
                  <option value={60}>60 FPS (Ultra fluido)</option>
                  <option value={30}>30 FPS (Modo ahorro)</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-zinc-400 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80 flex items-start gap-2.5">
              <Volume2 className="w-4 h-4 text-xbox-green flex-shrink-0 mt-0.5" />
              <span>
                <strong>Nota sobre Audio:</strong> Al seleccionar la pantalla en el diálogo de macOS, asegúrate de marcar la casilla <em>&quot;Compartir audio del sistema&quot;</em> o de la pestaña.
              </span>
            </div>
          </div>

          {/* Botón Principal de Acción */}
          <div>
            {!isStreaming ? (
              <button
                type="button"
                onClick={handleStartCast}
                className="w-full py-4 px-6 rounded-2xl bg-xbox-green hover:bg-xbox-lightGreen active:bg-xbox-darkGreen text-white font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-xbox-green/20 transition-all hover:scale-[1.01]"
              >
                <Play className="w-6 h-6 fill-current" />
                Iniciar Transmisión
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopCast}
                className="w-full py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-red-600/20 transition-all hover:scale-[1.01]"
              >
                <StopCircle className="w-6 h-6" />
                Detener Transmisión
              </button>
            )}
          </div>
        </div>

        {/* Columna Derecha: Vista previa de la pantalla capturada */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex-1 min-h-[380px] bg-black rounded-3xl border border-zinc-800 overflow-hidden flex flex-col relative">
            <div className="p-4 border-b border-zinc-900 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold text-white">Vista Previa Local</span>
              <span>{isStreaming ? `${resolution} @ ${fps}fps` : 'Sin señal activa'}</span>
            </div>

            <div className="flex-1 flex items-center justify-center relative bg-zinc-950">
              {isStreaming ? (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted // Silenciado localmente para evitar feedback/eco en el Mac
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-8 flex flex-col items-center gap-3 text-zinc-500">
                  <Cast className="w-12 h-12 opacity-30" />
                  <p className="text-sm">Pulsa &quot;Iniciar Transmisión&quot; para seleccionar la pantalla a emitir</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <DebugPanel />
    </TVSafeLayout>
  );
}
