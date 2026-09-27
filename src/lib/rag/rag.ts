import { SIMILARITY_THRESHOLD } from "@/lib/config";
import type { AskResponse, ChatTurn } from "@/types/rag";
import { embedText } from "@/lib/rag/embed";
import { generateAnswer } from "@/lib/rag/generate";
import { INSUFFICIENT_CONTEXT_ANSWER } from "@/lib/rag/prompt";
import { retrieveChunks } from "@/lib/rag/retrieve";

/**
 * Embed the question, search Qdrant, then answer from the chunks that clear
 * the similarity threshold. Weak matches are dropped so the model is not
 * given irrelevant clinic text to talk around.
 */
export const answerQuestion = async (messages: ChatTurn[]): Promise<AskResponse> => {
  const trimmed = messages[messages.length - 1]?.content.trim() ?? "";
  if (!trimmed || messages[messages.length - 1]?.role !== "user") {
    throw new Error("Empty question");
  }

  console.log("Question");
  console.log(trimmed);

  const embedding = await embedText(trimmed);
  const retrieved = await retrieveChunks(embedding);
  const relevant = retrieved.filter((chunk) => chunk.score >= SIMILARITY_THRESHOLD);

  console.log(
    `Similarity threshold ${SIMILARITY_THRESHOLD}: ${relevant.length} of ${retrieved.length} chunks kept`,
  );

  if (relevant.length === 0) {
    console.log("Prompt skipped");
    console.log("LLM skipped");
    return {
      answer: INSUFFICIENT_CONTEXT_ANSWER,
      sources: [],
    };
  }

  const answer = await generateAnswer(messages, relevant);
  console.log("LLM response");
  console.log(answer);

  return {
    answer,
    sources: relevant.map((chunk) => ({
      source: chunk.source,
      score: chunk.score,
    })),
  };
};
