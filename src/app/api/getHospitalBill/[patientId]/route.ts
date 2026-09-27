import { getHospitalBill } from "@/lib/patient";

type BillRouteContext = {
  params: Promise<{ patientId: string }>;
};

export const GET = async (
  _request: Request,
  context: BillRouteContext,
): Promise<Response> => {
  const { patientId } = await context.params;
  const trimmed = patientId.trim();
  if (!trimmed) {
    return Response.json({ error: "Missing patient id" }, { status: 400 });
  }

  return Response.json({ bill: getHospitalBill(trimmed) });
};
