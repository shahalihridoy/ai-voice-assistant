import type { RetrievedChunk } from "@/types/rag";

export const INSUFFICIENT_CONTEXT_ANSWER =
  "I don't have enough information in the clinic knowledge base to answer that question.";

const SYSTEM_PROMPT = `You are the receptionist for a clinic.
Answer using only the clinic context in the user message.
Do not invent information.
Do not use outside knowledge.
Do not diagnose, prescribe, or recommend treatment.
Answer the question only when the context contains that answer.
Do not substitute a different clinic fact.
If the context does not contain the answer, reply exactly: ${INSUFFICIENT_CONTEXT_ANSWER}
Keep the answer concise and helpful.`;

export type GroundedPrompt = {
  system: string;
  user: string;
};

export const buildPrompt = (
  question: string,
  context: RetrievedChunk[]
): GroundedPrompt => {
  const contextBlock = context
    .map((chunk) => `Source: ${chunk.source}\n${chunk.text}`)
    .join("\n\n");

  return {
    system: SYSTEM_PROMPT,
    user: `Clinic context:\n${contextBlock}\n\nQuestion: ${question}`
  };
};
