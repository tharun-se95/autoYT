/**
 * Decode standard / URL-safe base64 (with whitespace) into bytes — browser-safe.
 */
export function decodeBase64ToUint8Array(b64: string): Uint8Array {
  const normalized = b64
    .replace(/\s/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded =
    pad === 0 ? normalized : normalized + "=".repeat(4 - pad);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}
