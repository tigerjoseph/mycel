/** Local embedding interface. Phase 0 ships a deterministic stub so insights can store a vector without cloud keys. */

export interface Embedder {
  embed(text: string): Promise<number[]>
}

export const STUB_EMBEDDING_DIM = 64

function hashChar(code: number, salt: number): number {
  const x = Math.sin(code * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** Deterministic, no-network embedder. Same text always yields the same unit vector. */
export class StubEmbedder implements Embedder {
  async embed(text: string): Promise<number[]> {
    const input = text.trim().toLowerCase()
    const vec = new Array<number>(STUB_EMBEDDING_DIM).fill(0)
    if (!input) return vec

    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i)
      vec[i % STUB_EMBEDDING_DIM] += hashChar(code, i)
      vec[(code + i) % STUB_EMBEDDING_DIM] += hashChar(code, i + 17)
    }

    let mag = 0
    for (const n of vec) mag += n * n
    mag = Math.sqrt(mag) || 1
    return vec.map((n) => n / mag)
  }
}

let current: Embedder = new StubEmbedder()

export function getEmbedder(): Embedder {
  return current
}

export function setEmbedder(embedder: Embedder): void {
  current = embedder
}
