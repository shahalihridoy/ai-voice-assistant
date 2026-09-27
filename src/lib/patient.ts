export const getPatientDetails = (patientId: string): string => {
  if (!patientId.trim()) {
    throw new Error("Missing patient id");
  }

  return "Shah Ali, age:30, problem: fever";
};

export const getHospitalBill = (patientId: string): number => {
  if (!patientId.trim()) {
    throw new Error("Missing patient id");
  }

  return 3454;
};
