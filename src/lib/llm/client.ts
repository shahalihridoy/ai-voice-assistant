import { LLM_MAX_TOKENS, LLM_MODEL, LLM_TEMPERATURE } from "@/lib/config";
import { publicErrorMessage, requireEnv } from "@/lib/env";
import type { ChatTurn } from "@/types/rag";

const LLM_URL = "https://api.groq.com/openai/v1/chat/completions";

const clinicTools = [
  {
    type: "function",
    function: {
      name: "generateSerialNumber",
      description:
        "Create the next consecutive serial number. Use this when the user asks for a serial number.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getHospitalBill",
      description:
        "Look up a hospital bill. Use this when the latest message asks for a bill. Pass the patient id from the conversation. If they say \"this patient\" or otherwise omit it, reuse the patient id from an earlier message. Pass an empty string only when the conversation never gives one.",
      parameters: {
        type: "object",
        properties: {
          patientId: {
            type: "string",
            description:
              "Patient id from the conversation. Reuse an earlier id when the latest message refers to that patient. Empty only if none was given.",
          },
        },
        required: ["patientId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getPatientDetails",
      description:
        "Look up a patient's name, age, and problem. Use this when the latest message asks for patient details. Pass the patient id from the conversation. If they say \"this patient\" or otherwise omit it, reuse the patient id from an earlier message. Pass an empty string only when the conversation never gives one.",
      parameters: {
        type: "object",
        properties: {
          patientId: {
            type: "string",
            description:
              "Patient id from the conversation. Reuse an earlier id when the latest message refers to that patient. Empty only if none was given.",
          },
        },
        required: ["patientId"],
      },
    },
  },
] as const;

const ROUTER_SYSTEM = `You route the latest clinic chat message to an API.
Read the whole conversation. Earlier messages supply details the latest message leaves out.
If the latest message refers to a patient already mentioned, such as "this patient", "their bill", or "the same id", reuse that patient id.
Call generateSerialNumber when the latest message wants a serial number.
Call getHospitalBill when the latest message wants a hospital bill.
Call getPatientDetails when the latest message wants patient details.
Copy the patient id from the conversation. If none was given, pass an empty string.
For questions about clinic hours, departments, doctors, or appointments, do not call a tool.`;

const PATIENT_ID_PATTERNS = [
  /\bpatient\s+id\s*[:#]?\s*([A-Za-z0-9-]+)\b/gi,
  /\bid\s*[:#]?\s*(\d+)\b/gi,
  /\bpatient\s+(\d+)\b/gi,
];

const lastPatientId = (content: string): string => {
  for (const pattern of PATIENT_ID_PATTERNS) {
    pattern.lastIndex = 0;
    const id = [...content.matchAll(pattern)].at(-1)?.[1];
    if (id) {
      return id;
    }
  }
  return "";
};

const patientIdFromConversation = (messages: ChatTurn[]): string => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const id = lastPatientId(messages[index].content);
    if (id) {
      return id;
    }
  }
  return "";
};

export type ClinicToolCall =
  | { name: "generateSerialNumber" }
  | { name: "getHospitalBill"; patientId: string }
  | { name: "getPatientDetails"; patientId: string }
  | { name: "none" };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readMessage = (value: unknown): Record<string, unknown> => {
  if (!isRecord(value) || !Array.isArray(value.choices)) {
    throw new Error("LLM API returned an unexpected response");
  }

  const choice = value.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) {
    throw new Error("LLM API returned an unexpected response");
  }

  return choice.message;
};

const readAnswer = (value: unknown): string => {
  const message = readMessage(value);
  if (typeof message.content !== "string") {
    throw new Error("LLM API returned an unexpected response");
  }

  return message.content;
};

const readArguments = (value: unknown): Record<string, unknown> => {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return isRecord(value) ? value : {};
};

const readToolCall = (message: Record<string, unknown>): ClinicToolCall => {
  if (!Array.isArray(message.tool_calls) || message.tool_calls.length === 0) {
    return { name: "none" };
  }

  const call = message.tool_calls[0];
  if (!isRecord(call) || !isRecord(call.function) || typeof call.function.name !== "string") {
    return { name: "none" };
  }

  if (call.function.name === "generateSerialNumber") {
    return { name: "generateSerialNumber" };
  }

  if (call.function.name === "getHospitalBill" || call.function.name === "getPatientDetails") {
    const args = readArguments(call.function.arguments);
    const patientId = typeof args.patientId === "string" ? args.patientId.trim() : "";
    return { name: call.function.name, patientId };
  }

  return { name: "none" };
};

const requestChat = async (body: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  tools?: typeof clinicTools;
  tool_choice?: "auto";
}): Promise<unknown> => {
  const apiKey = requireEnv("LLM_API_KEY");
  let response: Response;

  try {
    response = await fetch(LLM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: LLM_TEMPERATURE,
        max_tokens: LLM_MAX_TOKENS,
        ...body,
      }),
    });
  } catch (error) {
    throw new Error(
      `LLM API request failed: ${publicErrorMessage(error, "network error")}`,
    );
  }

  if (!response.ok) {
    let detail = "";
    try {
      const errorBody: unknown = await response.json();
      if (
        isRecord(errorBody) &&
        isRecord(errorBody.error) &&
        typeof errorBody.error.message === "string"
      ) {
        detail = `: ${errorBody.error.message}`;
      }
    } catch {
      detail = "";
    }

    throw new Error(
      publicErrorMessage(
        new Error(`LLM API failed (${response.status})${detail}`),
        "LLM API failed",
      ),
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(
      `LLM API returned invalid JSON: ${publicErrorMessage(error, "parse error")}`,
    );
  }
};

export const completeChat = async (system: string, user: string): Promise<string> => {
  const parsed = await requestChat({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  return readAnswer(parsed);
};

export const selectClinicTool = async (messages: ChatTurn[]): Promise<ClinicToolCall> => {
  const parsed = await requestChat({
    messages: [{ role: "system", content: ROUTER_SYSTEM }, ...messages],
    tools: clinicTools,
    tool_choice: "auto",
  });

  const choice = readToolCall(readMessage(parsed));
  if (
    (choice.name === "getHospitalBill" || choice.name === "getPatientDetails") &&
    !choice.patientId
  ) {
    return { ...choice, patientId: patientIdFromConversation(messages) };
  }

  return choice;
};
