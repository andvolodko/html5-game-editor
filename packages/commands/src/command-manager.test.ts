import { describe, expect, it } from "vitest";
import { CommandManager, CompositeCommand, type Command } from "./index.js";

function createCounterCommand(counter: { value: number }, delta: number): Command {
  return {
    name: `add:${delta}`,
    execute: () => {
      counter.value += delta;
    },
    undo: () => {
      counter.value -= delta;
    },
  };
}

describe("CommandManager", () => {
  it("executes and undoes commands", () => {
    const counter = { value: 0 };
    const manager = new CommandManager();

    manager.execute(createCounterCommand(counter, 5));
    expect(counter.value).toBe(5);
    expect(manager.canUndo).toBe(true);

    expect(manager.undo()).toBe(true);
    expect(counter.value).toBe(0);
    expect(manager.canRedo).toBe(true);
  });

  it("records an already-applied command without executing again", () => {
    const counter = { value: 5 };
    const manager = new CommandManager();
    manager.record(createCounterCommand(counter, 5));
    expect(counter.value).toBe(5);
    expect(manager.canUndo).toBe(true);
    expect(manager.undo()).toBe(true);
    expect(counter.value).toBe(0);
  });

  it("undoAsync awaits promise-returning undo", async () => {
    const counter = { value: 1 };
    const manager = new CommandManager();
    manager.record({
      name: "async-add",
      async execute() {
        counter.value += 1;
      },
      async undo() {
        counter.value -= 1;
      },
    });
    expect(await manager.undoAsync()).toBe(true);
    expect(counter.value).toBe(0);
    expect(await manager.redoAsync()).toBe(true);
    expect(counter.value).toBe(1);
  });

  it("redoes after undo", () => {
    const counter = { value: 0 };
    const manager = new CommandManager();

    manager.execute(createCounterCommand(counter, 2));
    manager.undo();
    expect(manager.redo()).toBe(true);
    expect(counter.value).toBe(2);
  });

  it("clears history", () => {
    const counter = { value: 0 };
    const manager = new CommandManager();

    manager.execute(createCounterCommand(counter, 1));
    manager.clear();

    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(false);
    expect(manager.undo()).toBe(false);
  });

  it("clears redo stack on new execute", () => {
    const counter = { value: 0 };
    const manager = new CommandManager();

    manager.execute(createCounterCommand(counter, 1));
    manager.undo();
    manager.execute(createCounterCommand(counter, 10));

    expect(manager.canRedo).toBe(false);
    expect(counter.value).toBe(10);
  });

  it("respects maxHistory", () => {
    const counter = { value: 0 };
    const manager = new CommandManager({ maxHistory: 2 });

    manager.execute(createCounterCommand(counter, 1));
    manager.execute(createCounterCommand(counter, 1));
    manager.execute(createCounterCommand(counter, 1));

    expect(manager.undoCount).toBe(2);
  });

  it("supports composite commands", () => {
    const counter = { value: 0 };
    const manager = new CommandManager();
    const composite = new CompositeCommand("batch", [
      createCounterCommand(counter, 1),
      createCounterCommand(counter, 2),
    ]);

    manager.execute(composite);
    expect(counter.value).toBe(3);
    manager.undo();
    expect(counter.value).toBe(0);
  });
});
