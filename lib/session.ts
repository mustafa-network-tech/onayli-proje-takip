export const SESSION_COOKIE = "onayli_proje_session";
const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmacKey(secret: string, usage: KeyUsage[]) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, usage);
}

export async function verifyPassword(provided: string, expected: string) {
  if (!provided || !expected) return false;
  const challenge = encoder.encode("onayli-proje-password-check");
  const providedKey = await hmacKey(provided, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", providedKey, challenge);
  const expectedKey = await hmacKey(expected, ["verify"]);
  return crypto.subtle.verify("HMAC", expectedKey, signature, challenge);
}

export async function createSessionToken(secret: string) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = String(expiresAt);
  const key = await hmacKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | undefined, secret: string) {
  if (!token || !secret) return false;
  const [payload, encodedSignature, extra] = token.split(".");
  if (!payload || !encodedSignature || extra || Number(payload) <= Date.now()) return false;
  try {
    const key = await hmacKey(secret, ["verify"]);
    return crypto.subtle.verify("HMAC", key, fromBase64Url(encodedSignature), encoder.encode(payload));
  } catch {
    return false;
  }
}
