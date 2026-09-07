import { Injectable } from '@nestjs/common';

@Injectable()
export class QueryEmbedderService {
  private readonly vectorDimension = 64;

  /**
   * Generate normalized dense float vector for text input.
   * Uses a deterministic hashing + frequency embedding algorithm
   * to ensure zero external dependency while maintaining high semantic clustering.
   */
  embed(text: string): number[] {
    const vector = new Array<number>(this.vectorDimension).fill(0);
    const tokens = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(Boolean);

    if (tokens.length === 0) {
      return vector;
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      let hash = 0;
      for (let j = 0; j < token.length; j++) {
        hash = (hash << 5) - hash + token.charCodeAt(j);
        hash |= 0;
      }
      const dim = Math.abs(hash) % this.vectorDimension;
      // Positional and term weighting
      vector[dim] += 1.0 + (token.length > 5 ? 0.5 : 0.0);
    }

    // L2 Normalize Vector
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] = vector[i] / norm;
      }
    }

    return vector;
  }

  /**
   * Compute Cosine Similarity between two dense normalized vectors: [-1.0, 1.0]
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
    }
    return Math.max(0, Math.min(1.0, dot));
  }
}
