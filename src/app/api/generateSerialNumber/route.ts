import { generateSerialNumber } from "@/lib/serial";

export const GET = async (): Promise<Response> => {
  return Response.json({ serial: generateSerialNumber() });
};
