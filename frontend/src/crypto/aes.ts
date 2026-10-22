/**
 * Operation Dead Drop: End-to-End Cryptographic Module
 * Strict client-side AES-256-GCM authenticated encryption via W3C Web Crypto API.
 * The server NEVER sees the raw key, the plaintext, or the URL hash.
 */

// Convert ArrayBuffer to URL-safe Base64 string
export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Convert URL-safe Base64 string to Uint8Array
export function base64UrlToBuffer(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates a 256-bit cryptographically random symmetric key.
 * Exported as Base64URL string for the URL fragment (#key=...).
 */
export function generateRandomRoomKey(): string {
  const rawBytes = new Uint8Array(32);
  crypto.getRandomValues(rawBytes);
  const keyBase64 = bufferToBase64Url(rawBytes);
  scrubMemory(rawBytes);
  return keyBase64;
}

/**
 * Imports a raw 32-byte key into a Web Crypto CryptoKey for AES-256-GCM.
 */
export async function importRoomKey(keyBase64Url: string): Promise<CryptoKey> {
  const rawBytes = base64UrlToBuffer(keyBase64Url);
  if (rawBytes.byteLength !== 32) {
    throw new Error(`Invalid key length: expected 32 bytes (256-bit), got ${rawBytes.byteLength}`);
  }

  const key = await crypto.subtle.importKey(
    'raw',
    rawBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  scrubMemory(rawBytes);
  return key;
}

/**
 * Encrypts an arbitrary JSON payload using AES-256-GCM.
 * Fresh 12-byte IV generated on each invocation.
 */
export async function encryptData(
  key: CryptoKey,
  payload: unknown,
  aadString?: string
): Promise<{ iv: string; ciphertext: string }> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const jsonString = JSON.stringify(payload);
  const plaintextBytes = new TextEncoder().encode(jsonString);

  const additionalData = aadString
    ? new TextEncoder().encode(aadString)
    : new Uint8Array(0);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
      additionalData: additionalData.buffer as ArrayBuffer,
      tagLength: 128,
    },
    key,
    plaintextBytes.buffer as ArrayBuffer
  );

  return {
    iv: bufferToBase64Url(iv),
    ciphertext: bufferToBase64Url(ciphertextBuffer),
  };
}

/**
 * Decrypts and authenticates an AES-GCM ciphertext payload.
 * Throws an error if tampered with or corrupted.
 */
export async function decryptData<T>(
  key: CryptoKey,
  ivBase64Url: string,
  ciphertextBase64Url: string,
  aadString?: string
): Promise<T> {
  const iv = base64UrlToBuffer(ivBase64Url);
  const ciphertext = base64UrlToBuffer(ciphertextBase64Url);

  const additionalData = aadString
    ? new TextEncoder().encode(aadString)
    : new Uint8Array(0);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
      additionalData: additionalData.buffer as ArrayBuffer,
      tagLength: 128,
    },
    key,
    ciphertext.buffer as ArrayBuffer
  );

  const decryptedText = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decryptedText) as T;
}

/**
 * Actively overwrites a typed array with zero bytes in memory.
 */
export function scrubMemory(buffer: Uint8Array): void {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = 0;
  }
}
