import { callChosenApi } from "@/lib/call-clinic-api";
import { publicErrorMessage } from "@/lib/env";
import { selectClinicTool } from "@/lib/llm/client";
import { answerQuestion } from "@/lib/rag/rag";
import type { AskRequest } from "@/types/rag";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readQuestion = (value: unknown): AskRequest | undefined => {
  if (!isRecord(value) || typeof value.question !== "string") {
    return undefined;
  }

  return { question: value.question };
};

export const POST = async (request: Request): Promise<Response> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Question must be a string" }, { status: 400 });
  }

  const parsed = readQuestion(body);
  if (!parsed) {
    return Response.json({ error: "Question must be a string" }, { status: 400 });
  }

  const question = parsed.question.trim();
  if (!question) {
    return Response.json({ error: "Empty question" }, { status: 400 });
  }

  try {
    const choice = await selectClinicTool(question);
    const action = await callChosenApi(choice, new URL(request.url).origin);
    if (action) {
      return Response.json(action);
    }

    const result = await answerQuestion(question);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: publicErrorMessage(error, "Could not answer the question") },
      { status: 500 },
    );
  }
};
