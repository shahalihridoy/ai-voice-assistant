let nextSerial = 1;

export const generateSerialNumber = (): number => {
  const serial = nextSerial;
  nextSerial += 1;
  return serial;
};
