import type { SceneRenderStats } from "@game-editor/scene";
import type { Application, Container } from "pixi.js";

const BATCH_RENDER_PIPE_ID = "batch";
const INDICES_PER_TRIANGLE = 3;
const DEFAULT_CANVAS_COUNT = 1;

interface BatchLikeInstruction {
  renderPipeId: string;
  size?: number;
}

/**
 * Sample draw-call / triangle estimates from Pixi's last instruction set.
 * Best-effort — instruction layout can change across Pixi versions.
 */
export function samplePixiRenderStats(
  app: Application | undefined,
): SceneRenderStats {
  if (!app) {
    return { drawCalls: 0, triangles: 0, canvas: 0 };
  }

  let drawCalls = 0;
  let triangles = 0;
  collectInstructionStats(app.stage, (instruction) => {
    if (instruction.renderPipeId !== BATCH_RENDER_PIPE_ID) {
      return;
    }
    drawCalls += 1;
    const indexCount =
      typeof instruction.size === "number" ? instruction.size : 0;
    if (indexCount > 0) {
      triangles += Math.floor(indexCount / INDICES_PER_TRIANGLE);
    }
  });

  return {
    drawCalls,
    triangles,
    canvas: DEFAULT_CANVAS_COUNT,
  };
}

function collectInstructionStats(
  container: Container,
  visit: (instruction: BatchLikeInstruction) => void,
): void {
  const group = container.renderGroup;
  if (!group) {
    return;
  }
  const set = group.instructionSet;
  const count = set.instructionSize;
  for (let i = 0; i < count; i += 1) {
    const instruction = set.instructions[i] as BatchLikeInstruction | undefined;
    if (instruction) {
      visit(instruction);
    }
  }
}
