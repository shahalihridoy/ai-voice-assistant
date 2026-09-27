import type { ChatTurn, RetrievedChunk } from "@/types/rag";

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
The conversation may say who or what the latest question refers to. Use it only to understand the question.
Keep the answer concise and helpful.`;

export type GroundedPrompt = {
  system: string;
  user: string;
};

const conversationBlock = (messages: ChatTurn[]): string => {
  const prior = messages.slice(0, -1);
  if (prior.length === 0) {
    return "";
  }

  const lines = prior
    .map((message) => `${message.role === "user" ? "Visitor" : "Receptionist"}: ${message.content}`)
    .join("\n");

  return `Conversation so far:\n${lines}\n\n`;
};

export const buildPrompt = (
  messages: ChatTurn[],
  context: RetrievedChunk[],
): GroundedPrompt => {
  const contextBlock = context
    .map((chunk) => `Source: ${chunk.source}\n${chunk.text}`)
    .join("\n\n");
  const question = messages[messages.length - 1]?.content ?? "";

  return {
    system: SYSTEM_PROMPT,
    user: `Clinic context:\n${contextBlock}\n\n${conversationBlock(messages)}Question: ${question}`,
  };
};
