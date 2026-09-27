import { callChosenApi } from "@/lib/call-clinic-api";
import { publicErrorMessage } from "@/lib/env";
import { selectClinicTool } from "@/lib/llm/client";
import { answerQuestion } from "@/lib/rag/rag";
import type { AskRequest, ChatTurn } from "@/types/rag";

const MAX_CHAT_MESSAGES = 40;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isChatTurn = (value: unknown): value is ChatTurn =>
  isRecord(value) &&
  (value.role === "user" || value.role === "assistant") &&
  typeof value.content === "string" &&
  value.content.trim().length > 0;

const readMessages = (value: unknown): AskRequest | undefined => {
  if (!isRecord(value) || !Array.isArray(value.messages) || value.messages.length === 0) {
    return undefined;
  }

  if (!value.messages.every(isChatTurn)) {
    return undefined;
  }

  const messages = value.messages.slice(-MAX_CHAT_MESSAGES).map((message) => ({
    role: message.role,
    content: message.content.trim(),
  }));

  if (messages[messages.length - 1]?.role !== "user") {
    return undefined;
  }

  return { messages };
};

export const POST = async (request: Request): Promise<Response> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Question must be a string" }, { status: 400 });
  }

  const parsed = readMessages(body);
  if (!parsed) {
    return Response.json({ error: "Question must be a string" }, { status: 400 });
  }

  try {
    const choice = await selectClinicTool(parsed.messages);
    const action = await callChosenApi(choice, new URL(request.url).origin);
    if (action) {
      return Response.json(action);
    }

    const result = await answerQuestion(parsed.messages);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: publicErrorMessage(error, "Could not answer the question") },
      { status: 500 },
    );
  }
};
