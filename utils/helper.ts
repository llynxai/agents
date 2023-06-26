export const isValidJsonString = (data: string) => {
  try {
    JSON.parse(data);
    return true;
  } catch (err: unknown) {
    return false;
  }
};
export const isValidJson = (data: object) => {
  try {
    JSON.stringify(data);
    return true;
  } catch (err: unknown) {
    return false;
  }
};
