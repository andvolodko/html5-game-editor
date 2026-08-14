/**
 * Undoable user mutation. Prefer one command per completed interaction.
 * File/catalog operations may return a Promise from execute/undo.
 */
export interface Command {
  readonly name: string;
  /** File/catalog ops: Editor uses undoAsync/redoAsync instead of sync undo/redo. */
  readonly async?: boolean;
  execute(): void | Promise<void>;
  undo(): void | Promise<void>;
}

export interface CommandManagerOptions {
  maxHistory?: number;
}

function isThenable(value: unknown): value is Promise<void> {
  return typeof value === "object" && value !== null && "then" in value;
}

export class CommandManager {
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];
  private readonly maxHistory: number;

  constructor(options: CommandManagerOptions = {}) {
    this.maxHistory = options.maxHistory ?? 100;
  }

  execute(command: Command): void {
    const result = command.execute();
    if (isThenable(result)) {
      throw new Error(
        `Command ${command.name} execute() is async; use executeAsync`,
      );
    }
    this.record(command);
  }

  async executeAsync(command: Command): Promise<void> {
    await command.execute();
    this.record(command);
  }

  /**
   * Push a command that already applied its mutation (skip execute).
   * Redo still calls execute().
   */
  record(command: Command): void {
    this.undoStack.push(command);
    this.redoStack.length = 0;
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  peekUndo(): Command | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }

  peekRedo(): Command | undefined {
    return this.redoStack[this.redoStack.length - 1];
  }

  undo(): boolean {
    const command = this.undoStack[this.undoStack.length - 1];
    if (command === undefined) {
      return false;
    }
    const result = command.undo();
    if (isThenable(result)) {
      throw new Error(`Command ${command.name} undo() is async; use undoAsync`);
    }
    this.undoStack.pop();
    this.redoStack.push(command);
    return true;
  }

  async undoAsync(): Promise<boolean> {
    const command = this.undoStack.pop();
    if (command === undefined) {
      return false;
    }
    try {
      await command.undo();
    } catch (error) {
      this.undoStack.push(command);
      throw error;
    }
    this.redoStack.push(command);
    return true;
  }

  redo(): boolean {
    const command = this.redoStack[this.redoStack.length - 1];
    if (command === undefined) {
      return false;
    }
    const result = command.execute();
    if (isThenable(result)) {
      throw new Error(`Command ${command.name} execute() is async; use redoAsync`);
    }
    this.redoStack.pop();
    this.undoStack.push(command);
    return true;
  }

  async redoAsync(): Promise<boolean> {
    const command = this.redoStack.pop();
    if (command === undefined) {
      return false;
    }
    try {
      await command.execute();
    } catch (error) {
      this.redoStack.push(command);
      throw error;
    }
    this.undoStack.push(command);
    return true;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoCount(): number {
    return this.undoStack.length;
  }

  get redoCount(): number {
    return this.redoStack.length;
  }
}

/**
 * Runs child commands as a single undoable user action.
 * Undo applies children in reverse order.
 */
export class CompositeCommand implements Command {
  readonly name: string;
  private readonly children: readonly Command[];

  constructor(name: string, children: readonly Command[]) {
    this.name = name;
    this.children = children;
  }

  execute(): void {
    for (const child of this.children) {
      child.execute();
    }
  }

  undo(): void {
    for (let i = this.children.length - 1; i >= 0; i -= 1) {
      this.children[i]?.undo();
    }
  }
}
