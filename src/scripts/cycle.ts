export const step = (from: number, by: number, length: number) => (((from + by) % length) + length) % length;
