'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cast, Tv, Zap, Shield, Sparkles } from 'lucide-react';
import { TVSafeLayout } from '@/components/TVSafeLayout';

export default function HomePage() {
  const [localIp, setLocalIp] = useState<string>('localhost');

  useEffect(() => {
    // Detectar IP local del servidor
    fetch('/api/ip')
      .then((res) => res.json())
      .then((data) => {
        if (data.primaryIp) setLocalIp(data.primaryIp);
      })
      .catch(() => {});
  }, []);

  return (
    <TVSafeLayout className="flex flex-col justify-between py-10">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-xbox-green flex items-center justify-center shadow-lg shadow-xbox-green/30">
            <Cast className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Xbox Cast
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                P2P LAN
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Transmisión de pantalla de baja latencia a tu televisor</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/60 px-3 py-1.5 rounded-full border border-zinc-800">
          <Zap className="w-3.5 h-3.5 text-xbox-green" />
          <span>Latencia &lt;100ms • 60 FPS • H.264</span>
        </div>
      </header>

      {/* Main Action Cards */}
      <main className="my-auto py-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
            ¿Qué deseas hacer hoy?
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base">
            Elige el rol de este dispositivo. Para conectar, ambos deben estar en la misma red Wi-Fi o Ethernet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Tarjeta 1: Emisor (Mac / PC) */}
          <Link
            href="/cast"
            className="group relative flex flex-col items-start p-8 rounded-3xl bg-zinc-900/70 border-2 border-zinc-800 hover:border-xbox-green focus:border-xbox-green transition-all hover:shadow-2xl hover:shadow-xbox-green/10 focus:shadow-2xl focus:shadow-xbox-green/20"
          >
            <div className="p-4 rounded-2xl bg-zinc-800 group-hover:bg-xbox-green/20 text-white group-hover:text-xbox-green transition-colors mb-6">
              <Cast className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-xbox-green transition-colors">
              Emitir Pantalla
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              Usa este Mac o PC como fuente de vídeo y audio. Selecciona la pantalla completa o una ventana para transmitir a la consola.
            </p>
            <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-xbox-green">
              <span>Iniciar Emisor</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>

          {/* Tarjeta 2: Receptor (Xbox TV) */}
          <Link
            href="/tv"
            className="group relative flex flex-col items-start p-8 rounded-3xl bg-zinc-900/70 border-2 border-zinc-800 hover:border-xbox-green focus:border-xbox-green transition-all hover:shadow-2xl hover:shadow-xbox-green/10 focus:shadow-2xl focus:shadow-xbox-green/20"
          >
            <div className="p-4 rounded-2xl bg-zinc-800 group-hover:bg-xbox-green/20 text-white group-hover:text-xbox-green transition-colors mb-6">
              <Tv className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-xbox-green transition-colors">
              Recibir en TV (Xbox)
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              Abre esta opción en el navegador Microsoft Edge de tu Xbox. Introduce el PIN para conectar a pantalla completa sin lag.
            </p>
            <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-xbox-green">
              <span>Abrir Modo TV</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>
        </div>

        {/* Banner de ayuda para abrir en Xbox */}
        <div className="mt-12 max-w-2xl mx-auto p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-xbox-green flex-shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="text-zinc-400">Dirección para tu Xbox Edge: </span>
              <span className="font-mono font-semibold text-white">
                http://{localIp}:3000/tv
              </span>
            </div>
          </div>
          <Link
            href="/tv"
            className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-zinc-300 font-medium transition-colors"
          >
            Probar aquí
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-zinc-600 border-t border-zinc-900 pt-6">
        Diseñado para Xbox Series X|S y navegadores Chromium modernos en red local.
      </footer>
    </TVSafeLayout>
  );
}
