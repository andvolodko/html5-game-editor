import { createId } from "@game-editor/shared";

export const MAX_CONSOLE_LOG_ENTRIES = 500;

export const EDITOR_CONSOLE_CATEGORY_SCENE = "scene";
export const EDITOR_CONSOLE_EVENT_SCENE_OPENED = "scene.opened";

export type ConsoleLogLevel = "debug" | "info" | "warn" | "error";

export interface ConsoleLogEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly level: ConsoleLogLevel;
  readonly category: string;
  readonly message: string;
  readonly event?: string;
}

export interface ConsoleLogInput {
  level?: ConsoleLogLevel;
  category: string;
  message: string;
  event?: string;
}

export function formatSceneOpenedMessage(
  sceneFileId: string,
  sceneName: string,
): string {
  return `Opened scene "${sceneName}" (${sceneFileId}.json)`;
}

type ConsoleListener = () => void;

/**
 * Session log for the editor Console panel. Not scene/document state and
 * not undoable.
 */
export class EditorConsole {
  private entries: ConsoleLogEntry[] = [];
  private readonly listeners = new Set<ConsoleListener>();

  constructor(private readonly maxEntries = MAX_CONSOLE_LOG_ENTRIES) {}

  getEntries(): readonly ConsoleLogEntry[] {
    return this.entries;
  }

  log(input: ConsoleLogInput): void {
    this.entries.push({
      id: createId("log"),
      timestamp: Date.now(),
      level: input.level ?? "info",
      category: input.category,
      message: input.message,
      event: input.event,
    });
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
    this.emit();
  }

  logSceneOpened(sceneFileId: string, sceneName: string): void {
    this.log({
      category: EDITOR_CONSOLE_CATEGORY_SCENE,
      event: EDITOR_CONSOLE_EVENT_SCENE_OPENED,
      message: formatSceneOpenedMessage(sceneFileId, sceneName),
    });
  }

  clear(): void {
    if (this.entries.length === 0) {
      return;
    }
    this.entries = [];
    this.emit();
  }

  subscribe(listener: ConsoleListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose(): void {
    this.listeners.clear();
    this.entries = [];
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
