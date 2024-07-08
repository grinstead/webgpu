export function roundUpToMultiple(value: number, base: number) {
  return base * Math.ceil(value / base);
}
