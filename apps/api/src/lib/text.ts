const NON_WORD = /[^\p{L}\p{N}]+/gu;

export function normalizeText(input: string): string {
  return input.normalize('NFC').replace(/[\u064B-\u0652]/g, '');
}

export function tokenize(input: string): string[] {
  return normalizeText(input)
    .toLowerCase()
    .split(NON_WORD)
    .filter(Boolean);
}

export function cosineSimilarity(aTokens: string[], bTokens: string[]): number {
  if (!aTokens.length || !bTokens.length) return 0;
  const aFreq = new Map<string, number>();
  const bFreq = new Map<string, number>();
  for (const token of aTokens) {
    aFreq.set(token, (aFreq.get(token) ?? 0) + 1);
  }
  for (const token of bTokens) {
    bFreq.set(token, (bFreq.get(token) ?? 0) + 1);
  }
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (const [, freq] of aFreq) {
    aMag += freq * freq;
  }
  for (const [, freq] of bFreq) {
    bMag += freq * freq;
  }
  const smaller = aFreq.size < bFreq.size ? aFreq : bFreq;
  const bigger = smaller === aFreq ? bFreq : aFreq;
  for (const [token, freq] of smaller) {
    const other = bigger.get(token);
    if (other) dot += freq * other;
  }
  if (!dot) return 0;
  return dot / (Math.sqrt(aMag) * Math.sqrt(bMag));
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
