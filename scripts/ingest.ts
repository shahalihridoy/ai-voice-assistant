import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { publicErrorMessage } from "@/lib/env";
import { recreateCollection, upsertChunks } from "@/lib/qdrant/client";
import { chunkText } from "@/lib/rag/chunk";
import { embedPassages } from "@/lib/rag/embed";
import type { Chunk } from "@/types/rag";

const knowledgeDir = path.join(process.cwd(), "knowledge");

const documentTypeFromFile = (fileName: string): string =>
  path.basename(fileName, ".md");

const loadChunks = async (): Promise<Chunk[]> => {
  const entries = await readdir(knowledgeDir);
  const fileNames = entries.filter((name) => name.endsWith(".md")).sort();

  if (fileNames.length === 0) {
    throw new Error(`No markdown files found in ${knowledgeDir}`);
  }

  const chunks: Chunk[] = [];

  for (const fileName of fileNames) {
    const text = await readFile(path.join(knowledgeDir, fileName), "utf8");
    const fileChunks = chunkText(text, {
      source: fileName,
      documentType: documentTypeFromFile(fileName),
    });
    console.log(`${fileName}: ${fileChunks.length} chunk(s)`);
    chunks.push(...fileChunks);
  }

  return chunks;
};

const main = async (): Promise<void> => {
  const chunks = await loadChunks();
  const vectors = await embedPassages(chunks.map((chunk) => chunk.text));
  await recreateCollection();
  await upsertChunks(chunks, vectors);
  console.log(`Stored ${chunks.length} chunks`);
};

main().catch((error: unknown) => {
  console.error(publicErrorMessage(error, "Ingest failed"));
  process.exit(1);
});
