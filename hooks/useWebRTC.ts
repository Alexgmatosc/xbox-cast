'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useCastStore } from '@/store/useCastStore';
import { createSignalingClient, SignalingClient } from '@/lib/signaling';
import { preferH264 } from '@/lib/codecs';
import { detectDevice } from '@/lib/device';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC() {
  const {
    role,
    roomId,
    setConnectionState,
    setIceState,
    setSignalingState,
    setErrorMessage,
    setLocalStream,
    setRemoteStream,
    setPeerConnected,
    setPendingViewerRequest,
    setPendingViewerInfo,
    setIsStreamingActive,
    addViewer,
    removeViewer,
    setStats,
    addLog,
    reset,
  } = useCastStore();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const statsIntervalRef = useRef<any>(null);
  const isCreatingOfferRef = useRef<boolean>(false);
  const isProcessingOfferRef = useRef<boolean>(false);
  const pendingOfferCallbackRef = useRef<(() => void) | null>(null);

  // Envía el log tanto al estado local como al servidor de señalización (para ver Xbox en la consola)
  const logAndReport = useCallback(
    (msg: string) => {
      addLog(msg);
      if (signalingRef.current && signalingRef.current.isConnected()) {
        try {
          signalingRef.current.send('telemetry', {
            log: msg,
            iceState: pcRef.current?.iceConnectionState || 'closed',
            signalingState: pcRef.current?.signalingState || 'closed',
            connectionState: pcRef.current?.connectionState || 'disconnected',
          });
        } catch (_) {}
      }
    },
    [addLog]
  );

  // Limpieza de PeerConnection y recursos
  const cleanup = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onsignalingstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (signalingRef.current) {
      signalingRef.current.disconnect();
      signalingRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    iceCandidateQueueRef.current = [];
    isCreatingOfferRef.current = false;
    isProcessingOfferRef.current = false;
    pendingOfferCallbackRef.current = null;
    setPendingViewerRequest(false);
    setPendingViewerInfo(null);
    setIsStreamingActive(false);
    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnected(false);
    setIceState('closed');
    setSignalingState('closed');
  }, [setLocalStream, setRemoteStream, setPeerConnected, setPendingViewerRequest, setPendingViewerInfo, setIsStreamingActive, setIceState, setSignalingState]);

  // Monitor de estadísticas (FPS y latencia)
  const startStatsMonitor = (pc: RTCPeerConnection) => {
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);

    statsIntervalRef.current = setInterval(async () => {
      if (!pc || pc.connectionState !== 'connected') return;

      try {
        const stats = await pc.getStats();
        let fps = 0;
        let latencyMs = 0;
        let resolution = '1080p';

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            fps = report.framesPerSecond || 0;
            if (report.frameWidth && report.frameHeight) {
              resolution = `${report.frameWidth}x${report.frameHeight}`;
            }
          } else if (report.type === 'outbound-rtp' && report.kind === 'video') {
            fps = report.framesPerSecond || 0;
          } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.currentRoundTripTime) {
              latencyMs = Math.round(report.currentRoundTripTime * 1000);
            }
          }
        });

        setStats({ fps: Math.round(fps), latencyMs, resolution });
      } catch (err) {
        // Ignorar fallos puntuales en getStats
      }
    }, 2000);
  };

  // Creación de RTCPeerConnection con listeners estándar
  const createPeerConnection = useCallback((isReceiver: boolean = false) => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onsignalingstatechange = null;
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;
    setIceState(pc.iceConnectionState);
    setSignalingState(pc.signalingState);

    // Si es receptor en Xbox, configurar transceivers recvonly
    if (isReceiver) {
      try {
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });
        logAndReport('Transceivers configurados: video/audio recvonly');
      } catch (e) {
        console.warn('[WebRTC Receiver] Advertencia preparando transceivers:', e);
      }
    }

    // Manejador de candidatos ICE generados localmente
    pc.onicecandidate = (event) => {
      if (event.candidate && signalingRef.current) {
        const cand = event.candidate.candidate;
        const candidateType = cand.includes('typ host') ? 'HOST (LAN)' : cand.includes('typ srflx') ? 'STUN (WAN)' : 'OTRO';
        logAndReport(`ICE Local generado: ${candidateType}`);
        signalingRef.current.send('candidate', event.candidate.toJSON());
      }
    };

    // Cambio en el estado de conexión general
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[WebRTC] Connection state: ${state}`);
      logAndReport(`Connection state: ${state}`);
      if (state === 'connected') {
        setConnectionState('connected');
        setPeerConnected(true);
        startStatsMonitor(pc);
      } else if (state === 'disconnected' || state === 'failed') {
        setConnectionState('disconnected');
        setPeerConnected(false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`[WebRTC] ICE state: ${state}`);
      setIceState(state);
      logAndReport(`ICE state: ${state}`);
      if (state === 'connected' || state === 'completed') {
        setConnectionState('connected');
        setPeerConnected(true);
      } else if (state === 'disconnected' || state === 'failed') {
        setConnectionState('disconnected');
        setPeerConnected(false);
      }
    };

    pc.onsignalingstatechange = () => {
      const state = pc.signalingState;
      setSignalingState(state);
      logAndReport(`Signaling state: ${state}`);
    };

    // Receptor: escuchar tracks entrantes y asignar al MediaStream remoto
    pc.ontrack = (event) => {
      console.log('[WebRTC] Track remoto recibido:', event.track.kind);
      logAndReport(`Track remoto recibido: ${event.track.kind}`);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        const stream = new MediaStream([event.track]);
        setRemoteStream(stream);
      }
    };

    return pc;
  }, [setConnectionState, setIceState, setSignalingState, setPeerConnected, setRemoteStream, logAndReport]);

  // Procesar cola de candidatos ICE pendientes
  const flushIceQueue = async (pc: RTCPeerConnection) => {
    while (iceCandidateQueueRef.current.length > 0) {
      const candidateInit = iceCandidateQueueRef.current.shift();
      if (candidateInit) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
          logAndReport('Candidato ICE encolado aplicado');
        } catch (e) {
          console.warn('[WebRTC] Error añadiendo candidato ICE encolado:', e);
        }
      }
    }
  };

  // Iniciar señalización y conexión en reposo del Emisor (Mac)
  const initSender = useCallback(
    async (targetRoomId: string) => {
      try {
        if (signalingRef.current && signalingRef.current.isConnected()) {
          return;
        }

        setConnectionState('connecting');
        setErrorMessage(null);
        logAndReport(`Iniciando sala del emisor [${targetRoomId}] (Modo Standby)`);

        // 1. Conectar a señalización
        const signaling = createSignalingClient();
        signalingRef.current = signaling;
        await signaling.connect(targetRoomId, 'sender');
        logAndReport('Conectado al servidor de señalización');

        // Función para asegurar o recrear una PeerConnection limpia
        const setupSenderPeerConnection = () => {
          const pc = createPeerConnection(false);
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
              const sender = pc.addTrack(track, localStreamRef.current!);
              const transceivers = pc.getTransceivers();
              const transceiver = transceivers.find((t) => t.sender === sender);
              if (transceiver && track.kind === 'video') {
                preferH264(transceiver);
              }
            });
          } else {
            // Transceptores en reposo para permitir enlazar WebRTC antes de capturar pantalla
            const vt = pc.addTransceiver('video', { direction: 'sendonly' });
            preferH264(vt);
            pc.addTransceiver('audio', { direction: 'sendonly' });
            logAndReport('Transceptores en reposo inicializados (Standby)');
          }
          return pc;
        };

        let pc = setupSenderPeerConnection();

        // Función para enviar oferta fresca al receptor
        const sendOffer = async (reason: string) => {
          if (isCreatingOfferRef.current) {
            logAndReport(`Oferta ignorada (${reason}): ya se está generando una`);
            return;
          }

          if (
            !pc ||
            pc.signalingState === 'closed' ||
            pc.connectionState === 'failed' ||
            pc.connectionState === 'disconnected' ||
            pc.iceConnectionState === 'failed'
          ) {
            logAndReport('Recreando PeerConnection fresca para reconexión');
            pc = setupSenderPeerConnection();
          }

          isCreatingOfferRef.current = true;
          try {
            logAndReport(`Generando nueva Offer SDP (${reason})...`);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            signaling.send('offer', {
              type: offer.type,
              sdp: offer.sdp,
            });
            logAndReport('Offer SDP enviado a la sala');
          } catch (e: any) {
            console.error('[WebRTC Sender] Error al crear oferta SDP:', e);
            logAndReport(`Error creando oferta: ${e.message}`);
          } finally {
            isCreatingOfferRef.current = false;
          }
        };

        // Responder cuando un receptor solicita oferta
        signaling.on('request-offer', async (payload) => {
          const viewerInfo = payload?.viewer || {
            id: `viewer-${Math.random().toString(36).substring(2, 7)}`,
            name: 'Dispositivo',
            type: 'xbox',
          };

          logAndReport(`Petición de conexión de ${viewerInfo.name} (${viewerInfo.type})`);
          addViewer(viewerInfo);

          const requireApproval = useCastStore.getState().requireApproval;
          if (requireApproval) {
            logAndReport(`Esperando aprobación para ${viewerInfo.name}...`);
            setPendingViewerInfo(viewerInfo);
            setPendingViewerRequest(true);
            pendingOfferCallbackRef.current = async () => {
              setPendingViewerRequest(false);
              setPendingViewerInfo(null);
              await sendOffer('host-approved');
              // Notificar al receptor si la pantalla ya está activa
              const isCurrentlyStreaming = useCastStore.getState().isStreamingActive;
              signaling.send('stream-status', { active: isCurrentlyStreaming });
            };
          } else {
            await sendOffer('request-offer');
            const isCurrentlyStreaming = useCastStore.getState().isStreamingActive;
            signaling.send('stream-status', { active: isCurrentlyStreaming });
          }
        });

        // Escuchar respuesta SDP del receptor
        signaling.on('answer', async (answerPayload) => {
          try {
            logAndReport(`Respuesta SDP recibida (estado actual: ${pc.signalingState})`);
            if (pc.signalingState !== 'have-local-offer') {
              logAndReport(`Ignorando answer en estado '${pc.signalingState}'`);
              return;
            }
            if (!answerPayload || !answerPayload.sdp) {
              logAndReport('Respuesta SDP vacía recibida');
              return;
            }
            await pc.setRemoteDescription(
              new RTCSessionDescription({
                type: answerPayload.type || 'answer',
                sdp: answerPayload.sdp,
              })
            );
            await flushIceQueue(pc);
            logAndReport('Respuesta SDP remota aplicada con éxito (stable)');

            // Informar estado de transmisión al receptor
            const isCurrentlyStreaming = useCastStore.getState().isStreamingActive;
            signaling.send('stream-status', { active: isCurrentlyStreaming });
          } catch (err: any) {
            console.warn('[WebRTC Sender] Error al aplicar respuesta remota:', err);
            logAndReport(`Error aplicando respuesta: ${err.message}`);
          }
        });

        // Escuchar candidatos ICE del receptor
        signaling.on('candidate', async (candidatePayload) => {
          if (!pc || pc.signalingState === 'closed') return;
          if (!candidatePayload || !candidatePayload.candidate) return;

          const cand = candidatePayload.candidate;
          const candidateType = cand.includes('typ host') ? 'HOST (LAN)' : cand.includes('typ srflx') ? 'STUN (WAN)' : 'OTRO';
          logAndReport(`ICE Remoto recibido: ${candidateType}`);

          try {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(candidatePayload));
            } else {
              iceCandidateQueueRef.current.push(candidatePayload);
            }
          } catch (e) {
            console.warn('[WebRTC Sender] Error agregando candidato ICE:', e);
          }
        });
      } catch (err: any) {
        console.error('[WebRTC] Error iniciando emisor en reposo:', err);
        setConnectionState('error');
        setErrorMessage(err.message || 'Error al conectar con la sala');
        logAndReport(`Error emisor: ${err.message}`);
      }
    },
    [
      createPeerConnection,
      setConnectionState,
      setErrorMessage,
      addViewer,
      setPendingViewerInfo,
      setPendingViewerRequest,
      logAndReport,
    ]
  );

  // Iniciar o reanudar la captura de pantalla compartida (cambio en caliente sin desconectar)
  const startScreenShare = useCallback(
    async (options: { fps?: number; resolution?: '1080p' | '720p' } = {}) => {
      try {
        const targetFps = options.fps || 60;
        const width = options.resolution === '720p' ? 1280 : 1920;
        const height = options.resolution === '720p' ? 720 : 1080;

        logAndReport('Solicitando captura de pantalla al usuario...');
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: width },
            height: { ideal: height },
            frameRate: { ideal: targetFps, max: targetFps },
          },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsStreamingActive(true);
        logAndReport('Pantalla capturada correctamente');

        // Detectar si el usuario detiene la transmisión desde la barra del navegador
        stream.getVideoTracks()[0].onended = () => {
          logAndReport('Captura detenida por el usuario (banner del sistema)');
          pauseScreenShare();
        };

        // Reemplazar pistas en caliente en los transceptores existentes
        if (pcRef.current) {
          const transceivers = pcRef.current.getTransceivers();
          const videoTrack = stream.getVideoTracks()[0];
          const audioTrack = stream.getAudioTracks()[0];

          const vt = transceivers.find(
            (t) => t.sender.track?.kind === 'video' || t.receiver.track?.kind === 'video'
          );
          if (vt && videoTrack) {
            await vt.sender.replaceTrack(videoTrack);
            logAndReport('Pista de vídeo reemplazada en caliente');
          }

          const at = transceivers.find(
            (t) => t.sender.track?.kind === 'audio' || t.receiver.track?.kind === 'audio'
          );
          if (at && audioTrack) {
            await at.sender.replaceTrack(audioTrack);
            logAndReport('Pista de audio reemplazada en caliente');
          }
        }

        // Notificar a todos los receptores que la pantalla está activa
        if (signalingRef.current && signalingRef.current.isConnected()) {
          signalingRef.current.send('stream-status', { active: true });
        }
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          logAndReport('Selección de pantalla cancelada por el usuario');
        } else {
          console.error('[WebRTC] Error al capturar pantalla:', err);
          logAndReport(`Error captura: ${err.message}`);
        }
      }
    },
    [setLocalStream, setIsStreamingActive, logAndReport]
  );

  // Pausar transmisión de pantalla (vuelve a reposo sin cortar la sala WebRTC)
  const pauseScreenShare = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setIsStreamingActive(false);

    if (pcRef.current) {
      const transceivers = pcRef.current.getTransceivers();
      transceivers.forEach(async (t) => {
        try {
          await t.sender.replaceTrack(null);
        } catch (_) {}
      });
    }

    if (signalingRef.current && signalingRef.current.isConnected()) {
      signalingRef.current.send('stream-status', { active: false });
    }
    logAndReport('Transmisión de pantalla en pausa (reposo)');
  }, [setLocalStream, setIsStreamingActive, logAndReport]);

  // Emisor tradicional (inicia sala y pide pantalla)
  const startSender = useCallback(
    async (
      targetRoomId: string,
      options: { fps?: number; resolution?: '1080p' | '720p' } = {}
    ) => {
      await initSender(targetRoomId);
      await startScreenShare(options);
    },
    [initSender, startScreenShare]
  );

  // Iniciar como RECEPTOR (Xbox / Móvil / Tablet)
  const startReceiver = useCallback(
    async (targetRoomId: string) => {
      try {
        cleanup();
        setConnectionState('connecting');
        setErrorMessage(null);
        logAndReport(`Iniciando receptor para sala [${targetRoomId}]`);

        // 1. Conectar a señalización
        const signaling = createSignalingClient();
        signalingRef.current = signaling;
        await signaling.connect(targetRoomId, 'receiver');
        logAndReport('Conectado a servidor de señalización');

        // Escuchar cambios de estado en la transmisión (activo vs pausa/espera)
        signaling.on('stream-status', (payload) => {
          const active = !!payload?.active;
          logAndReport(`Estado de transmisión actualizado: ${active ? 'ACTIVO' : 'EN ESPERA'}`);
          setIsStreamingActive(active);
        });

        // 2. Crear RTCPeerConnection con transceivers recvonly
        let pc = createPeerConnection(true);

        // Escuchar oferta SDP del emisor
        signaling.on('offer', async (offerPayload) => {
          try {
            if (isProcessingOfferRef.current) {
              logAndReport('Ignorando oferta: ya se está procesando otra');
              return;
            }

            if (!offerPayload || typeof offerPayload !== 'object' || !offerPayload.sdp) {
              throw new Error('La oferta SDP recibida no es válida o no pudo ser procesada');
            }

            // Si la conexión anterior cerró o falló, recrear una limpia
            if (
              !pc ||
              pc.signalingState === 'closed' ||
              pc.connectionState === 'failed' ||
              pc.iceConnectionState === 'failed'
            ) {
              logAndReport('Recreando PeerConnection receptor...');
              pc = createPeerConnection(true);
            }

            if (pc.signalingState !== 'stable') {
              logAndReport(`Ignorando oferta en estado no estable '${pc.signalingState}'`);
              return;
            }

            isProcessingOfferRef.current = true;
            logAndReport('Procesando oferta SDP del emisor...');

            const rtcOffer = new RTCSessionDescription({
              type: offerPayload.type || 'offer',
              sdp: offerPayload.sdp,
            });

            await pc.setRemoteDescription(rtcOffer);
            await flushIceQueue(pc);
            logAndReport('Oferta remota aplicada correctamente');

            if ((pc.signalingState as string) !== 'have-remote-offer') {
              logAndReport(`Estado no es have-remote-offer (${pc.signalingState})`);
              return;
            }

            // Crear y enviar respuesta
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            logAndReport('Respuesta local establecida (stable)');

            signaling.send('answer', {
              type: answer.type,
              sdp: answer.sdp,
            });
            logAndReport('Respuesta SDP enviada al emisor');
          } catch (err: any) {
            console.error('[WebRTC Receiver] Error al procesar oferta SDP:', err);
            signaling.send('client-error', {
              stage: 'process-offer',
              message: err?.message || String(err),
              name: err?.name,
              state: pc?.signalingState,
            });
            setErrorMessage(`Error en receptor: ${err?.name || 'SDP'} - ${err?.message || err}`);
            logAndReport(`Error procesando oferta: ${err?.message || err}`);
          } finally {
            isProcessingOfferRef.current = false;
          }
        });

        // Escuchar candidatos ICE
        signaling.on('candidate', async (candidatePayload) => {
          if (!pc || pc.signalingState === 'closed') return;
          if (!candidatePayload || !candidatePayload.candidate) return;

          const cand = candidatePayload.candidate;
          const candidateType = cand.includes('typ host') ? 'HOST (LAN)' : cand.includes('typ srflx') ? 'STUN (WAN)' : 'OTRO';
          logAndReport(`ICE Remoto recibido: ${candidateType}`);

          try {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(candidatePayload));
            } else {
              iceCandidateQueueRef.current.push(candidatePayload);
            }
          } catch (e) {
            console.warn('[WebRTC Receiver] Error agregando ICE:', e);
          }
        });

        // Escuchar errores o rechazo del anfitrión
        signaling.on('client-error', (errorPayload) => {
          console.warn('[WebRTC Receiver] Notificación de error/rechazo:', errorPayload);
          setConnectionState('error');
          setErrorMessage(errorPayload?.message || 'Conexión denegada o error en la sala');
          logAndReport(`Receptor notificado de error: ${errorPayload?.message || 'Error desconocido'}`);
        });

        // Solicitar oferta al emisor adjuntando información de este dispositivo
        const currentDevice = detectDevice();
        logAndReport(`Enviando request-offer (${currentDevice.name})...`);
        signaling.send('request-offer', {
          viewer: {
            id: `viewer-${Math.random().toString(36).substring(2, 7)}`,
            name: currentDevice.name,
            type: currentDevice.type,
          },
        });
      } catch (err: any) {
        console.error('[WebRTC] Error iniciando receptor:', err);
        setConnectionState('error');
        setErrorMessage(err.message || 'Error al conectar con la sala');
        logAndReport(`Error receptor: ${err.message}`);
      }
    },
    [cleanup, createPeerConnection, setConnectionState, setErrorMessage, setIsStreamingActive, logAndReport]
  );

  const acceptViewer = useCallback(() => {
    setPendingViewerRequest(false);
    setPendingViewerInfo(null);
    if (pendingOfferCallbackRef.current) {
      logAndReport('Anfitrión aprobó la conexión del receptor.');
      pendingOfferCallbackRef.current();
      pendingOfferCallbackRef.current = null;
    }
  }, [logAndReport, setPendingViewerRequest, setPendingViewerInfo]);

  const rejectViewer = useCallback(() => {
    setPendingViewerRequest(false);
    setPendingViewerInfo(null);
    pendingOfferCallbackRef.current = null;
    logAndReport('Anfitrión rechazó la conexión del receptor.');
    if (signalingRef.current && signalingRef.current.isConnected()) {
      signalingRef.current.send('client-error', {
        stage: 'authorization',
        message: 'Conexión rechazada por el anfitrión del Mac.',
      });
    }
  }, [logAndReport, setPendingViewerRequest, setPendingViewerInfo]);

  const stopStreaming = useCallback(() => {
    cleanup();
    reset();
  }, [cleanup, reset]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    initSender,
    startScreenShare,
    pauseScreenShare,
    startSender,
    startReceiver,
    stopStreaming,
    acceptViewer,
    rejectViewer,
  };
}
