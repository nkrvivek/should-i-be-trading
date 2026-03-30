/**
 * Client-side encryption for localStorage broker credentials.
 * Uses AES-GCM with a key derived from the user's auth session ID.
 * This is defense-in-depth — not a substitute for server-side storage,
 * but prevents plaintext credential exposure to XSS/extensions.
 */

const ALGO = "AES-GCM";
const KEY_USAGE: KeyUsage[] = ["encrypt", "decrypt"];

/** Derive a stable AES key from a passphrase (user session ID) */
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  // Use a fixed salt — the passphrase (session ID) already has enough entropy
  const salt = encoder.encode("sibt-broker-creds-v1");
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: ALGO, length: 256 },
    false,
    KEY_USAGE,
  );
}

/** Encrypt plaintext → base64 string (iv + ciphertext) */
export async function encrypt(plaintext: string, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded);
  // Prepend IV to ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

/** Decrypt base64 string → plaintext */
export async function decrypt(encoded: string, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase);
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}
