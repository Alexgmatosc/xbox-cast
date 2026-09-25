/**
 * Configura las preferencias de códec en un RTCRtpTransceiver para priorizar H.264
 * Esto permite decodificación acelerada por hardware en Microsoft Edge sobre Xbox Series S/X.
 */
export function preferH264(transceiver: RTCRtpTransceiver): void {
  if (typeof RTCRtpSender.getCapabilities !== 'function') {
    return;
  }

  try {
    const capabilities = RTCRtpSender.getCapabilities('video');
    if (!capabilities || !capabilities.codecs) return;

    const codecs = capabilities.codecs;
    const h264Codecs = codecs.filter((codec) =>
      codec.mimeType.toLowerCase() === 'video/h264'
    );
    const otherCodecs = codecs.filter(
      (codec) => codec.mimeType.toLowerCase() !== 'video/h264'
    );

    // Colocar códecs H.264 primero en la lista de negociación SDP
    const preferredCodecs = [...h264Codecs, ...otherCodecs];

    if (typeof transceiver.setCodecPreferences === 'function') {
      transceiver.setCodecPreferences(preferredCodecs);
      console.log('[WebRTC] Prioridad de códecs establecida: H.264 preferido');
    }
  } catch (error) {
    console.warn('[WebRTC] No se pudieron aplicar preferencias de códec H.264:', error);
  }
}
