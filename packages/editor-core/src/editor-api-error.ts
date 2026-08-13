/** Shown when the editor cannot reach project-server (browser `fetch` failed). */
export const PROJECT_SERVER_OFFLINE_MESSAGE = "Project server is offline.";

const NETWORK_FAILURE_MESSAGES = new Set([
  "failed to fetch",
  "fetch failed",
  "load failed",
  "networkerror when attempting to fetch resource.",
  "the internet connection appears to be offline.",
]);

export function formatEditorApiErrorMessage(message: string): string {
  const normalized = message.trim().toLowerCase();
  if (NETWORK_FAILURE_MESSAGES.has(normalized)) {
    return PROJECT_SERVER_OFFLINE_MESSAGE;
  }
  return message;
}

export function formatEditorApiError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) {
    return formatEditorApiErrorMessage(error.message);
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return formatEditorApiErrorMessage(error);
  }
  return fallback;
}

/** Formats and de-duplicates panel error lines (assets + scenes both fail offline). */
export function uniquePanelErrorMessages(
  ...messages: Array<string | null | undefined>
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of messages) {
    if (raw === null || raw === undefined) {
      continue;
    }
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const formatted = formatEditorApiErrorMessage(trimmed);
    if (seen.has(formatted)) {
      continue;
    }
    seen.add(formatted);
    result.push(formatted);
  }
  return result;
}
