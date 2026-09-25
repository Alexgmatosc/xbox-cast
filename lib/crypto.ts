/**
 * Utilidades criptográficas de extremo a extremo (E2EE) usando Web Crypto API nativa.
 * Deriva una clave AES-GCM (256-bit) a partir del PIN de emparejamiento.
 */

// Salt determinista basado en el identificador de la sala
async function getRoomSalt(roomId: string): Promise<BufferSource> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(`xbox-cast-salt-${roomId}`));
  return hash.slice(0, 16);
}

// Derivar clave AES-GCM (256 bits) usando PBKDF2 a partir del PIN
export async function deriveKeyFromPin(pin: string, roomId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const pinData = enc.encode(pin.trim());
  const salt = await getRoomSalt(roomId);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    pinData,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 50000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Cifrar cualquier objeto (SDP u objeto candidate) a string base64 cifrado
export async function encryptPayload(key: CryptoKey, data: any): Promise<string> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = enc.encode(JSON.stringify(data));

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encodedData
  );

  // Empaquetar IV + ciphertext en un array buffer
  const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.length);

  // Convertir a base64
  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

// Descifrar string base64 al objeto original. Lanza error si el PIN es incorrecto.
export async function decryptPayload(key: CryptoKey, base64Cipher: string): Promise<any> {
  const binary = atob(base64Cipher);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decryptedBuffer));
}
