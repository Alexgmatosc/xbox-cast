'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useCastStore } from '@/store/useCastStore';
import { createSignalingClient, SignalingClient } from '@/lib/signaling';
import { preferH264 } from '@/lib/codecs';

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
    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnected(false);
    setIceState('closed');
    setSignalingState('closed');
  }, [setLocalStream, setRemoteStream, setPeerConnected, setPendingViewerRequest, setIceState, setSignalingState]);

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

  // Iniciar como EMISOR (Mac)
  const startSender = useCallback(
    async (
      targetRoomId: string,
      options: { fps?: number; resolution?: '1080p' | '720p' } = {}
    ) => {
      try {
        cleanup();
        setConnectionState('connecting');
        setErrorMessage(null);
        logAndReport(`Iniciando emisor para sala [${targetRoomId}]`);

        const targetFps = options.fps || 60;
        const width = options.resolution === '720p' ? 1280 : 1920;
        const height = options.resolution === '720p' ? 720 : 1080;

        // 1. Capturar pantalla y audio con getDisplayMedia
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
        logAndReport('Pantalla capturada correctamente');

        // Detectar si el usuario cancela la captura desde el banner nativo del navegador
        stream.getVideoTracks()[0].onended = () => {
          logAndReport('Captura detenida por el usuario');
          stopStreaming();
        };

        // 2. Conectar señalización
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
          }
          return pc;
        };

        let pc = setupSenderPeerConnection();

        // 3. Función segura para enviar oferta fresca al receptor
        const sendOffer = async (reason: string) => {
          if (isCreatingOfferRef.current) {
            logAndReport(`Oferta ignorada (${reason}): ya se está generando una`);
            return;
          }

          // Si la PeerConnection previa falló o cerró, recrear una limpia
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

        // Responder cuando el receptor pide oferta
        signaling.on('request-offer', async () => {
          logAndReport('Petición de conexión recibida del receptor (request-offer)');
          const requireApproval = useCastStore.getState().requireApproval;
          if (requireApproval) {
            logAndReport('Esperando aprobación del anfitrión en el Mac...');
            setPendingViewerRequest(true);
            pendingOfferCallbackRef.current = async () => {
              setPendingViewerRequest(false);
              await sendOffer('host-approved');
            };
          } else {
            await sendOffer('request-offer');
          }
        });

        // Escuchar respuesta SDP del receptor (Xbox)
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
            await pc.setRemoteDescription(new RTCSessionDescription({
              type: answerPayload.type || 'answer',
              sdp: answerPayload.sdp,
            }));
            await flushIceQueue(pc);
            logAndReport('Respuesta SDP remota aplicada con éxito (stable)');
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
        console.error('[WebRTC] Error iniciando emisor:', err);
        setConnectionState('error');
        setErrorMessage(
          err.name === 'NotAllowedError'
            ? 'Permiso de captura de pantalla denegado por el usuario.'
            : err.message || 'Error al iniciar la transmisión'
        );
        logAndReport(`Error emisor: ${err.message}`);
      }
    },
    [cleanup, createPeerConnection, setConnectionState, setErrorMessage, setLocalStream, logAndReport]
  );

  // Iniciar como RECEPTOR (Xbox)
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

        // 2. Crear RTCPeerConnection con transceivers recvonly
        let pc = createPeerConnection(true);

        // Escuchar oferta SDP del emisor
        signaling.on('offer', async (offerPayload) => {
          try {
            if (isProcessingOfferRef.current) {
              logAndReport('Ignorando oferta: ya se está procesando otra');
              return;
            }

            if (!offerPayload || !offerPayload.sdp) {
              throw new Error('La oferta SDP recibida está vacía');
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
            setErrorMessage(`Error en Xbox: ${err?.name || 'SDP'} - ${err?.message || err}`);
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

        // Solicitar oferta al emisor
        logAndReport('Enviando request-offer al emisor...');
        signaling.send('request-offer');
      } catch (err: any) {
        console.error('[WebRTC] Error iniciando receptor:', err);
        setConnectionState('error');
        setErrorMessage(err.message || 'Error al conectar con la sala');
        logAndReport(`Error receptor: ${err.message}`);
      }
    },
    [cleanup, createPeerConnection, setConnectionState, setErrorMessage, logAndReport]
  );

  const acceptViewer = useCallback(() => {
    setPendingViewerRequest(false);
    if (pendingOfferCallbackRef.current) {
      logAndReport('Anfitrión aprobó la conexión del receptor.');
      pendingOfferCallbackRef.current();
      pendingOfferCallbackRef.current = null;
    }
  }, [logAndReport, setPendingViewerRequest]);

  const rejectViewer = useCallback(() => {
    setPendingViewerRequest(false);
    pendingOfferCallbackRef.current = null;
    logAndReport('Anfitrión rechazó la conexión del receptor.');
    if (signalingRef.current && signalingRef.current.isConnected()) {
      signalingRef.current.send('client-error', {
        stage: 'authorization',
        message: 'Conexión rechazada por el anfitrión del Mac.',
      });
    }
  }, [logAndReport, setPendingViewerRequest]);

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
    startSender,
    startReceiver,
    stopStreaming,
    acceptViewer,
    rejectViewer,
  };
}
