import { getPatientDetails } from "@/lib/patient";

type PatientRouteContext = {
  params: Promise<{ patientId: string }>;
};

export const GET = async (
  _request: Request,
  context: PatientRouteContext,
): Promise<Response> => {
  const { patientId } = await context.params;
  const trimmed = patientId.trim();
  if (!trimmed) {
    return Response.json({ error: "Missing patient id" }, { status: 400 });
  }

  return Response.json({ details: getPatientDetails(trimmed) });
};
