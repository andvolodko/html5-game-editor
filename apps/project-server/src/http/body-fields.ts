import { ValidationError } from "@game-editor/core";

/** Read an optional string field from a JSON body. */
export function readStringField(
  body: unknown,
  key: string,
): string | undefined {
  if (typeof body !== "object" || body === null || !(key in body)) {
    return undefined;
  }
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

/** Read a required non-empty string field; throws ValidationError otherwise. */
export function requireStringField(
  body: unknown,
  key: string,
  message: string,
): string {
  const value = readStringField(body, key);
  if (!value) {
    throw new ValidationError(message);
  }
  return value;
}
