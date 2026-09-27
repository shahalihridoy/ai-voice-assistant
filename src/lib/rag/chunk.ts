import { CHUNK_OVERLAP, CHUNK_SIZE } from "@/lib/config";
import type { Chunk } from "@/types/rag";

/**
 * Fixed-size character windows with overlap.
 * The same text always produces the same chunks. This file does not read files or call APIs.
 * Source and document type are passed in because they are not part of the text.
 */
export const chunkText = (
  text: string,
  metadata: { source: string; documentType: string },
): Chunk[] => {
  const step = CHUNK_SIZE - CHUNK_OVERLAP;
  if (step <= 0) {
    throw new Error("CHUNK_OVERLAP must be smaller than CHUNK_SIZE");
  }

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const slices: string[] = [];
  if (normalized.length <= CHUNK_SIZE) {
    slices.push(normalized);
  } else {
    let start = 0;
    while (start < normalized.length) {
      const end = Math.min(start + CHUNK_SIZE, normalized.length);
      const piece = normalized.slice(start, end).trim();
      if (piece) {
        slices.push(piece);
      }
      if (end === normalized.length) {
        break;
      }
      start += step;
    }
  }

  return slices.map((piece, chunkIndex) => ({
    source: metadata.source,
    documentType: metadata.documentType,
    chunkIndex,
    text: piece,
  }));
};
