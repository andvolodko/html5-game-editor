/**
 * Undoable user mutation. Prefer one command per completed interaction.
 */
export interface Command {
  readonly name: string;
  execute(): void;
  undo(): void;
}

export interface CommandManagerOptions {
  maxHistory?: number;
}

export class CommandManager {
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];
  private readonly maxHistory: number;

  constructor(options: CommandManagerOptions = {}) {
    this.maxHistory = options.maxHistory ?? 100;
  }

  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack.length = 0;

    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  undo(): boolean {
    const command = this.undoStack.pop();
    if (command === undefined) {
      return false;
    }
    command.undo();
    this.redoStack.push(command);
    return true;
  }

  redo(): boolean {
    const command = this.redoStack.pop();
    if (command === undefined) {
      return false;
    }
    command.execute();
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
