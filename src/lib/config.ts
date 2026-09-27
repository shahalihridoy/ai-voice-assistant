/**
 * Single place for RAG settings.
 * Chunk size and overlap are character counts for the first deterministic splitter.
 * Top K is how many Qdrant hits retrieval returns.
 * Chunks below the similarity threshold are not sent to the LLM.
 * If none remain, generation is skipped.
 * Jina cosine scores for a correct but loosely worded question can sit near 0.15.
 * A cutoff of 0.5 only kept near-paraphrases, so "what are the departments" was dropped
 * even though departments.md was the top hit.
 * Vector size must match the embedding model. Jina embeddings v3 defaults to 1024.
 */
export const TOP_K = 3;
export const SIMILARITY_THRESHOLD = 0.12;
export const CHUNK_SIZE = 500;
export const CHUNK_OVERLAP = 50;
export const COLLECTION_NAME = "clinic_knowledge";
export const EMBEDDING_MODEL = "jina-embeddings-v3";
export const VECTOR_SIZE = 1024;
export const LLM_MODEL = "openai/gpt-oss-20b";
export const LLM_TEMPERATURE = 0;
export const LLM_MAX_TOKENS = 256;
