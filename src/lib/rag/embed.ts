import { EMBEDDING_MODEL, VECTOR_SIZE } from "@/lib/config";
import { publicErrorMessage, requireEnv } from "@/lib/env";

const EMBEDDING_URL = "https://api.jina.ai/v1/embeddings";

/**
 * Jina v3 uses separate adapters for documents and questions.
 * Passages are embedded at ingest time. Questions use retrieval.query at search time.
 * Both sides must use the same model and vector size or similarity scores are meaningless.
 */
type EmbeddingTask = "retrieval.query" | "retrieval.passage";

type EmbeddingRow = {
  index?: number;
  embedding?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === "number");

const readEmbeddingRows = (value: unknown): EmbeddingRow[] => {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error("Embedding API returned an unexpected response");
  }

  return value.data.filter(isRecord).map((row) => ({
    index: typeof row.index === "number" ? row.index : undefined,
    embedding: row.embedding,
  }));
};

const embedTexts = async (
  texts: string[],
  task: EmbeddingTask,
): Promise<number[][]> => {
  if (texts.length === 0) {
    return [];
  }

  if (texts.some((text) => text.trim().length === 0)) {
    throw new Error("Cannot embed an empty string");
  }

  const apiKey = requireEnv("EMBEDDING_API_KEY");
  let response: Response;

  try {
    response = await fetch(EMBEDDING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        task,
        dimensions: VECTOR_SIZE,
        embedding_type: "float",
        input: texts,
      }),
    });
  } catch (error) {
    throw new Error(
      `Embedding API request failed: ${publicErrorMessage(error, "network error")}`,
    );
  }

  if (!response.ok) {
    throw new Error(`Embedding API failed (${response.status})`);
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch (error) {
    throw new Error(
      `Embedding API returned invalid JSON: ${publicErrorMessage(error, "parse error")}`,
    );
  }

  const rows = readEmbeddingRows(parsed);

  if (rows.length !== texts.length) {
    throw new Error("Embedding API returned an unexpected response");
  }

  const ordered = [...rows].sort((left, right) => (left.index ?? 0) - (right.index ?? 0));

  return ordered.map((row) => {
    if (!isNumberArray(row.embedding) || row.embedding.length !== VECTOR_SIZE) {
      throw new Error(
        `Embedding API returned a vector of unexpected length (expected ${VECTOR_SIZE})`,
      );
    }
    return row.embedding;
  });
};

export const embedText = async (text: string): Promise<number[]> => {
  const [embedding] = await embedTexts([text], "retrieval.query");
  if (!embedding) {
    throw new Error("Embedding API returned no vector");
  }

  console.log(`Embedding generated (${embedding.length} dimensions)`);
  return embedding;
};

export const embedPassages = async (texts: string[]): Promise<number[][]> => {
  const embeddings = await embedTexts(texts, "retrieval.passage");
  console.log(
    `Embedding generated for ${embeddings.length} passages (${VECTOR_SIZE} dimensions)`,
  );
  return embeddings;
};
