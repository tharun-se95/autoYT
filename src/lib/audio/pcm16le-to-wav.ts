/** Wrap 16-bit little-endian PCM in a minimal WAV container for `<audio>` playback. */
export function pcm16leToWav(
  pcm: Uint8Array,
  sampleRate: number,
  numChannels: 1 | 2,
): Uint8Array {
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  if (pcm.length % blockAlign !== 0) {
    throw new Error(
      `PCM byte length ${pcm.length} is not aligned to ${blockAlign} bytes per frame (${numChannels}ch × 16-bit).`,
    );
  }
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.length;
  const headerSize = 44;
  const out = new Uint8Array(headerSize + dataSize);
  const view = new DataView(out.buffer);
  let o = 0;
  const w4 = (s: string) => {
    for (let i = 0; i < 4; i++) view.setUint8(o++, s.charCodeAt(i));
  };
  const w2 = (n: number) => {
    view.setUint16(o, n, true);
    o += 2;
  };
  const w4n = (n: number) => {
    view.setUint32(o, n, true);
    o += 4;
  };

  w4("RIFF");
  w4n(36 + dataSize);
  w4("WAVE");
  w4("fmt ");
  w4n(16);
  w2(1);
  w2(numChannels);
  w4n(sampleRate);
  w4n(byteRate);
  w2(blockAlign);
  w2(bitsPerSample);
  w4("data");
  w4n(dataSize);
  out.set(pcm, headerSize);
  return out;
}

/** @deprecated use {@link pcm16leToWav} with `numChannels: 1` */
export function pcm16leMonoToWav(pcm: Uint8Array, sampleRate: number): Uint8Array {
  return pcm16leToWav(pcm, sampleRate, 1);
}

/** Parse optional `rate=24000` from MIME strings like `audio/L16;codec=pcm;rate=24000`. */
export function parsePcmSampleRateFromMime(mimeType: string): number | null {
  const m = /rate=(\d+)/i.exec(mimeType);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parse optional `channels=2` when the API includes it. */
export function parsePcmChannelsFromMime(mimeType: string): 1 | 2 | null {
  const m = /channels?\s*=\s*(\d+)/i.exec(mimeType);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n === 2) return 2;
  if (n === 1) return 1;
  return null;
}
