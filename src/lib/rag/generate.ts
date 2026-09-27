import { completeChat } from "@/lib/llm/client";
import { buildPrompt } from "@/lib/rag/prompt";
import type { ChatTurn, RetrievedChunk } from "@/types/rag";

export const generateAnswer = async (
  messages: ChatTurn[],
  context: RetrievedChunk[],
): Promise<string> => {
  if (context.length === 0) {
    throw new Error("Cannot generate an answer without retrieved context");
  }

  const prompt = buildPrompt(messages, context);
  console.log("Prompt generated");
  console.log(prompt.system);
  console.log(prompt.user);

  const answer = (await completeChat(prompt.system, prompt.user)).trim();
  if (!answer) {
    throw new Error("LLM returned an empty answer");
  }

  return answer;
};
