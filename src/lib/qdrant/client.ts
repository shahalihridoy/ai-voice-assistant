import { QdrantClient } from "@qdrant/js-client-rest";
import { COLLECTION_NAME, VECTOR_SIZE } from "@/lib/config";
import { publicErrorMessage, requireEnv } from "@/lib/env";
import type { Chunk } from "@/types/rag";

export const createQdrantClient = (): QdrantClient =>
  new QdrantClient({
    url: requireEnv("QDRANT_URL"),
    apiKey: requireEnv("QDRANT_API_KEY"),
  });

const qdrantError = (action: string, error: unknown): Error =>
  new Error(
    `Qdrant ${action} failed: ${publicErrorMessage(error, "connection error")}`,
  );

/**
 * Rebuild the collection on each ingest.
 * Re-running ingest then replaces vectors after chunking or the embedding model changes.
 * Cosine score in Qdrant is similarity: higher means closer.
 */
export const recreateCollection = async (): Promise<void> => {
  const client = createQdrantClient();

  try {
    const existing = await client.collectionExists(COLLECTION_NAME);
    if (existing.exists) {
      await client.deleteCollection(COLLECTION_NAME);
    }

    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: "Cosine",
      },
    });
  } catch (error) {
    throw qdrantError("collection setup", error);
  }
};

export const upsertChunks = async (
  chunks: Chunk[],
  vectors: number[][],
): Promise<void> => {
  if (chunks.length === 0) {
    throw new Error("No chunks to store");
  }

  if (chunks.length !== vectors.length) {
    throw new Error("Each chunk needs one embedding");
  }

  const points = chunks.map((chunk, index) => {
    const vector = vectors[index];
    if (!vector) {
      throw new Error(`Missing embedding for chunk ${index}`);
    }

    return {
      id: index + 1,
      vector,
      payload: {
        source: chunk.source,
        documentType: chunk.documentType,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
      },
    };
  });

  const client = createQdrantClient();

  try {
    await client.upsert(COLLECTION_NAME, {
      wait: true,
      points,
    });
  } catch (error) {
    throw qdrantError("upsert", error);
  }
};
