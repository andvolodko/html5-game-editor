export type Id = string;

export function createId(prefix?: string): Id {
  const id = crypto.randomUUID();
  return prefix === undefined ? id : `${prefix}_${id}`;
}

export function assertId(value: unknown, label = "id"): asserts value is Id {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Expected non-empty string ${label}`);
  }
}
