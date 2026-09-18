/** Local embedding interface. Deterministic stub — no cloud keys required at boot. */

import { contentTokens } from '@shared/contentEngine'

export interface Embedder {
  embed(text: string): Promise<number[]>
}

export const STUB_EMBEDDING_DIM = 256

function hashToken(token: string): number {
  let h = 2166136261
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function l2Normalize(vec: number[]): number[] {
  let mag = 0
  for (const n of vec) mag += n * n
  mag = Math.sqrt(mag) || 1
  return vec.map((n) => n / mag)
}

/**
 * Deterministic, no-network embedder. Hashed unigrams + bigrams of content tokens.
 * Character features are omitted — they collapse unrelated English into similar vectors.
 */
export class StubEmbedder implements Embedder {
  async embed(text: string): Promise<number[]> {
    const tokens = contentTokens(text)
    const vec = new Array<number>(STUB_EMBEDDING_DIM).fill(0)
    if (tokens.length === 0) return vec

    for (let t = 0; t < tokens.length; t++) {
      const token = tokens[t]
      vec[hashToken(token) % STUB_EMBEDDING_DIM] += 2
      if (t + 1 < tokens.length) {
        vec[hashToken(`${token}_${tokens[t + 1]}`) % STUB_EMBEDDING_DIM] += 2.4
      }
    }

    return l2Normalize(vec)
  }
}

let current: Embedder = new StubEmbedder()

export function getEmbedder(): Embedder {
  return current
}

export function setEmbedder(embedder: Embedder): void {
  current = embedder
}
