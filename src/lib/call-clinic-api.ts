import type { ClinicToolCall } from "@/lib/llm/client";
import type { AskResponse } from "@/types/rag";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    throw new Error("Clinic API returned invalid JSON");
  }
};

const callEndpoint = async (origin: string, path: string): Promise<unknown> => {
  const response = await fetch(new URL(path, origin));
  const payload = await readJson(response);
  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.error === "string"
        ? payload.error
        : "Clinic API request failed";
    throw new Error(message);
  }
  return payload;
};

/**
 * The model picks an endpoint. This function performs that HTTP call.
 * A missing patient id is answered here, without calling the endpoint.
 */
export const callChosenApi = async (
  choice: ClinicToolCall,
  origin: string,
): Promise<AskResponse | undefined> => {
  if (choice.name === "none") {
    return undefined;
  }

  console.log(`LLM chose ${choice.name}`);

  if (choice.name === "generateSerialNumber") {
    const payload = await callEndpoint(origin, "/api/generateSerialNumber");
    if (!isRecord(payload) || typeof payload.serial !== "number") {
      throw new Error("Serial number API returned an unexpected response");
    }
    console.log("Called GET /api/generateSerialNumber");
    return {
      answer: `Your serial number is ${payload.serial}.`,
      sources: [],
    };
  }

  if (!choice.patientId) {
    const subject = choice.name === "getHospitalBill" ? "hospital bill" : "patient details";
    return {
      answer: `Please include a patient id to see the ${subject}.`,
      sources: [],
    };
  }

  const path = `/api/${choice.name}/${encodeURIComponent(choice.patientId)}`;
  const payload = await callEndpoint(origin, path);
  console.log(`Called GET ${path}`);

  if (choice.name === "getHospitalBill") {
    if (!isRecord(payload) || typeof payload.bill !== "number") {
      throw new Error("Hospital bill API returned an unexpected response");
    }
    return {
      answer: `The hospital bill for patient ${choice.patientId} is ${payload.bill}.`,
      sources: [],
    };
  }

  if (!isRecord(payload) || typeof payload.details !== "string") {
    throw new Error("Patient details API returned an unexpected response");
  }

  return {
    answer: `Patient ${choice.patientId}: ${payload.details}`,
    sources: [],
  };
};
