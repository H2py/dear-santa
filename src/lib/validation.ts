export const requiredString = (value: any, name: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
};

export const requiredInt = (value: any, name: string) => {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new Error(`${name} must be integer`);
  return n;
};

export const inRange = (value: number, min: number, max: number, name: string) => {
  if (value < min || value > max) throw new Error(`${name} must be between ${min} and ${max}`);
  return value;
};
