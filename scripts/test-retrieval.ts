import { publicErrorMessage } from "@/lib/env";
import { embedText } from "@/lib/rag/embed";
import { retrieveChunks } from "@/lib/rag/retrieve";

const question = process.argv.slice(2).join(" ").trim();

const main = async (): Promise<void> => {
  if (!question) {
    throw new Error(
      'Empty question. Usage: yarn test:retrieval "What time does the cardiology department open?"',
    );
  }

  console.log("Question");
  console.log(question);

  const embedding = await embedText(question);
  const chunks = await retrieveChunks(embedding);

  console.log("Similarity scores");
  if (chunks.length === 0) {
    console.log("No relevant search results");
    return;
  }

  for (const chunk of chunks) {
    console.log(`${chunk.source} ${chunk.score.toFixed(4)}`);
  }

  console.log("Source documents");
  for (const chunk of chunks) {
    console.log(chunk.source);
  }

  console.log("Retrieved chunks");
  for (const chunk of chunks) {
    console.log("---");
    console.log(chunk.text);
  }
};

main().catch((error: unknown) => {
  console.error(publicErrorMessage(error, "Retrieval test failed"));
  process.exit(1);
});
