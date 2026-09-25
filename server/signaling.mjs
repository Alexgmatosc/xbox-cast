import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';

const PORT = process.env.SIGNALING_PORT || 3001;
const wss = new WebSocketServer({ port: Number(PORT), host: '0.0.0.0' });

// Map of roomId -> Set of client WebSockets
const rooms = new Map();

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const primaryLocalIp = getLocalIpAddresses()[0] || '127.0.0.1';

function getClientIp(ws) {
  let ip = ws._socket?.remoteAddress || '';
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  if (ip === '127.0.0.1' || ip === '::1' || !ip) {
    return primaryLocalIp;
  }
  return ip;
}

function unmaskCandidate(text, realIp) {
  if (!text || typeof text !== 'string' || !realIp) return text;
  if (text.includes('.local')) {
    const unmasked = text.replace(/[\w-]+\.local/gi, realIp);
    return unmasked;
  }
  return text;
}

wss.on('connection', (ws) => {
  let currentRoom = null;
  let clientRole = null;
  const clientRealIp = getClientIp(ws);

  ws.on('message', (messageRaw) => {
    try {
      const message = JSON.parse(messageRaw.toString());
      const { type, roomId, role, payload } = message;

      if (!roomId) return;

      if (type === 'join') {
        currentRoom = roomId;
        clientRole = role || 'guest';

        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set());
        }

        const roomClients = rooms.get(roomId);
        const alreadyInRoom = roomClients.has(ws);
        roomClients.add(ws);

        if (alreadyInRoom) {
          console.log(`[Signaling] Cliente (${clientRole}) ya estaba en [${roomId}].`);
          return;
        }

        const badge = clientRole === 'receiver' ? '📺 [XBOX CONECTADO]' : '💻 [MAC CONECTADO]';
        console.log(`${badge} Sala: [${roomId}] desde IP: ${clientRealIp}. Total en sala: ${roomClients.size}`);

        for (const client of roomClients) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'peer-joined',
              roomId,
              payload: { role: clientRole, ip: clientRealIp }
            }));
          }
        }
        return;
      }

      // Telemetría en tiempo real desde los clientes (Mac y Xbox)
      if (type === 'telemetry') {
        const isXbox = (clientRole || role) === 'receiver';
        const badge = isXbox ? '📺 [XBOX]' : '💻 [MAC]';
        const ice = payload?.iceState ? ` [ICE: ${payload.iceState}]` : '';
        const sig = payload?.signalingState ? ` [SIG: ${payload.signalingState}]` : '';
        console.log(`${badge}${ice}${sig} ${payload?.log || ''}`);
        return;
      }

      if (type === 'client-error') {
        const isXbox = (clientRole || role) === 'receiver';
        const badge = isXbox ? '📺 [XBOX ERROR]' : '💻 [MAC ERROR]';
        console.error(`${badge} ->`, payload);
        return;
      }

      console.log(`[Signaling] [${type}] de '${clientRole || role}' (@ ${clientRealIp}) en [${roomId}]`);

      let outgoingPayload = payload;
      const effectiveIp = clientRole === 'sender' ? primaryLocalIp : clientRealIp;

      // 1. Si es un OFFER o ANSWER SDP, des-enmascarar mDNS (.local) dentro del texto SDP
      if ((type === 'offer' || type === 'answer') && payload && payload.sdp) {
        if (payload.sdp.includes('.local')) {
          console.log(`[Signaling] ⚡ Des-enmascarando mDNS en ${type.toUpperCase()} SDP (.local -> ${effectiveIp})`);
          outgoingPayload = {
            ...payload,
            sdp: unmaskCandidate(payload.sdp, effectiveIp),
          };
        }
      }

      // 2. Si es un candidato ICE individual, des-enmascarar mDNS (.local)
      if (type === 'candidate' && payload) {
        console.log(`[Signaling ICE Raw] (${clientRole}):`, payload.candidate);
        if (payload.candidate && payload.candidate.includes('.local')) {
          console.log(`[Signaling] ⚡ Des-enmascarando mDNS en candidato ICE (.local -> ${effectiveIp})`);
          outgoingPayload = {
            ...payload,
            candidate: unmaskCandidate(payload.candidate, effectiveIp),
          };
        }
      }

      // Reenviar a los demás participantes en la sala
      if (rooms.has(roomId)) {
        const roomClients = rooms.get(roomId);
        for (const client of roomClients) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type,
              roomId,
              payload: outgoingPayload
            }));
          }
        }
      }
    } catch (err) {
      console.error('[Signaling] Error procesando mensaje:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const roomClients = rooms.get(currentRoom);
      roomClients.delete(ws);
      const badge = clientRole === 'receiver' ? '📺 [XBOX DESCONECTADO]' : '💻 [MAC DESCONECTADO]';
      console.log(`${badge} de sala [${currentRoom}]. Restantes: ${roomClients.size}`);

      for (const client of roomClients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'peer-left',
            roomId: currentRoom,
            payload: { role: clientRole }
          }));
        }
      }

      if (roomClients.size === 0) {
        rooms.delete(currentRoom);
      }
    }
  });

  ws.on('error', (err) => {
    console.error('[Signaling] Error en socket:', err);
  });
});

const ips = getLocalIpAddresses();
console.log('='.repeat(55));
console.log(`📡 Servidor de señalización WebRTC activo en puerto ${PORT}`);
console.log(`🏠 IP Primaria del Mac para WebRTC LAN: ${primaryLocalIp}`);
console.log('📱 Direcciones IP locales detectadas:');
for (const ip of ips) {
  console.log(`   ➡️  http://${ip}:3000/tv (Abre esto en Edge de Xbox)`);
}
console.log('='.repeat(55));
