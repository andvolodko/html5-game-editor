/** Unique strings, first occurrence wins — Aseprite often repeats tag names per layer. */
export function uniqueSelectOptions(options: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const option of options) {
    if (seen.has(option)) {
      continue;
    }
    seen.add(option);
    unique.push(option);
  }
  return unique;
}
