'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cast, Tv, Zap, Sparkles, Smartphone, Monitor, ShieldCheck, ArrowRight } from 'lucide-react';
import { TVSafeLayout } from '@/components/TVSafeLayout';
import { useDevice } from '@/hooks/useDevice';

export default function HomePage() {
  const [localIp, setLocalIp] = useState<string>('localhost');
  const [displayUrl, setDisplayUrl] = useState<string>('');
  const { isMobile, isXbox, isTV, isDesktop, name } = useDevice();

  useEffect(() => {
    fetch('/api/ip')
      .then((res) => res.json())
      .then((data) => {
        if (data.primaryIp) setLocalIp(data.primaryIp);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLocal =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);
      if (isLocal) {
        const port = window.location.port ? `:${window.location.port}` : '';
        setDisplayUrl(`http://${localIp || 'localhost'}${port}/tv`);
      } else {
        setDisplayUrl(`${window.location.origin}/tv`);
      }
    }
  }, [localIp]);

  return (
    <TVSafeLayout isTV={isXbox || isTV} className="flex flex-col justify-between py-8 sm:py-10">
      {/* Barra Superior */}
      <header className="flex items-center justify-between border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-xbox-green flex items-center justify-center shadow-lg shadow-xbox-green/30">
            <Cast className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Xbox Cast
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                P2P Ultra-Low Latency
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              Transmisión de pantalla directa a tu Xbox, TV o pantalla secundaria
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/60 px-3.5 py-1.5 rounded-full border border-zinc-800">
          <Zap className="w-3.5 h-3.5 text-xbox-green" />
          <span>&lt;100ms • 60 FPS • E2EE</span>
        </div>
      </header>

      {/* Banner de Dispositivo Detectado */}
      <div className="mt-6 max-w-4xl mx-auto w-full">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-xbox-green flex-shrink-0">
              {isXbox ? (
                <Tv className="w-4 h-4" />
              ) : isMobile ? (
                <Smartphone className="w-4 h-4 text-emerald-400" />
              ) : (
                <Monitor className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <div>
              <span className="text-zinc-400">Dispositivo detectado: </span>
              <strong className="text-white font-semibold">{name}</strong>
              <span className="text-zinc-500 hidden sm:inline">
                {' '}
                — {isXbox ? 'Optimizado para mando' : isMobile ? 'Interfaz táctil activa' : 'Panel de escritorio'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-[11px] font-medium text-emerald-400 flex-shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Listo</span>
          </div>
        </div>
      </div>

      {/* Acciones Principales */}
      <main className="my-auto py-8">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3 text-white">
            ¿Qué deseas hacer hoy?
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base">
            Elige el rol de este dispositivo. La conexión se realiza directamente punto a punto (P2P).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Tarjeta 1: Emisor (Mac / PC / Laptop) */}
          <Link
            href="/cast"
            className={`group relative flex flex-col items-start p-6 sm:p-8 rounded-3xl bg-zinc-900/70 border-2 transition-all hover:shadow-2xl hover:shadow-xbox-green/10 focus:shadow-2xl focus:shadow-xbox-green/20 ${
              isDesktop
                ? 'border-xbox-green/60 shadow-lg shadow-xbox-green/5'
                : 'border-zinc-800 hover:border-xbox-green'
            }`}
          >
            {isDesktop && (
              <span className="absolute -top-3 right-6 bg-xbox-green text-black text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow">
                Recomendado en este equipo
              </span>
            )}
            <div className="p-4 rounded-2xl bg-zinc-800 group-hover:bg-xbox-green/20 text-white group-hover:text-xbox-green transition-colors mb-5">
              <Cast className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-xbox-green transition-colors">
              Emitir Pantalla
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              Transmite la pantalla completa o una ventana específica desde este ordenador a tu Xbox o pantalla secundaria.
            </p>
            <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-xbox-green">
              <span>Iniciar Emisor</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Tarjeta 2: Receptor (Xbox / Smart TV / Móvil) */}
          <Link
            href="/tv"
            className={`group relative flex flex-col items-start p-6 sm:p-8 rounded-3xl bg-zinc-900/70 border-2 transition-all hover:shadow-2xl hover:shadow-xbox-green/10 focus:shadow-2xl focus:shadow-xbox-green/20 ${
              isXbox || isMobile
                ? 'border-xbox-green/60 shadow-lg shadow-xbox-green/5'
                : 'border-zinc-800 hover:border-xbox-green'
            }`}
          >
            {(isXbox || isMobile) && (
              <span className="absolute -top-3 right-6 bg-xbox-green text-black text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow">
                Recomendado en este equipo
              </span>
            )}
            <div className="p-4 rounded-2xl bg-zinc-800 group-hover:bg-xbox-green/20 text-white group-hover:text-xbox-green transition-colors mb-5">
              {isMobile ? <Smartphone className="w-8 h-8" /> : <Tv className="w-8 h-8" />}
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-xbox-green transition-colors">
              {isMobile ? 'Recibir en Móvil' : 'Recibir en TV (Xbox)'}
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              {isMobile
                ? 'Usa este teléfono o tableta como pantalla secundaria para ver la transmisión en directo con baja latencia.'
                : 'Abre esta opción en Microsoft Edge de tu Xbox. Introduce el PIN para conectar a pantalla completa.'}
            </p>
            <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-xbox-green">
              <span>{isMobile ? 'Abrir Receptor Móvil' : 'Abrir Modo TV'}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        {/* Banner de ayuda con URL para receptores */}
        <div className="mt-10 max-w-2xl mx-auto p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-xbox-green flex-shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="text-zinc-400">Dirección para el receptor: </span>
              <span className="font-mono font-semibold text-white">
                {displayUrl || 'Cargando enlace...'}
              </span>
            </div>
          </div>
          <Link
            href="/tv"
            className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3.5 py-2 rounded-xl text-zinc-200 font-medium transition-colors"
          >
            Abrir aquí
          </Link>
        </div>
      </main>

      {/* Pie de página */}
      <footer className="text-center text-xs text-zinc-600 border-t border-zinc-900 pt-6">
        Optimizado para Xbox Series X|S, Smart TVs y navegadores Chromium modernos.
      </footer>
    </TVSafeLayout>
  );
}
