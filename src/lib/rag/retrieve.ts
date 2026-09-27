import { QdrantClient } from "@qdrant/js-client-rest";
import { COLLECTION_NAME, TOP_K, VECTOR_SIZE } from "@/lib/config";
import { publicErrorMessage } from "@/lib/env";
import { createQdrantClient } from "@/lib/qdrant/client";
import type { Chunk, RetrievedChunk } from "@/types/rag";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readChunkPayload = (payload: unknown): Chunk | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const { source, documentType, chunkIndex, text } = payload;
  if (
    typeof source !== "string" ||
    typeof documentType !== "string" ||
    typeof chunkIndex !== "number" ||
    typeof text !== "string"
  ) {
    return undefined;
  }

  return { source, documentType, chunkIndex, text };
};

const searchCollection = async (
  client: QdrantClient,
  questionEmbedding: number[],
): Promise<RetrievedChunk[]> => {
  try {
    const result = await client.query(COLLECTION_NAME, {
      query: questionEmbedding,
      limit: TOP_K,
      with_payload: true,
    });

    return result.points.flatMap((point) => {
      const chunk = readChunkPayload(point.payload);
      if (!chunk) {
        return [];
      }
      return [{ ...chunk, score: point.score }];
    });
  } catch (error) {
    throw new Error(
      `Qdrant search failed: ${publicErrorMessage(error, "connection error")}`,
    );
  }
};

export const retrieveChunks = async (
  questionEmbedding: number[],
): Promise<RetrievedChunk[]> => {
  if (questionEmbedding.length !== VECTOR_SIZE) {
    throw new Error(`Question embedding must have ${VECTOR_SIZE} dimensions`);
  }

  const chunks = await searchCollection(createQdrantClient(), questionEmbedding);

  console.log("Retrieved chunks");
  if (chunks.length === 0) {
    console.log("No relevant search results");
    return chunks;
  }

  for (const chunk of chunks) {
    console.log(
      `${chunk.source} chunk ${chunk.chunkIndex} similarity ${chunk.score.toFixed(4)}`,
    );
  }

  return chunks;
};
