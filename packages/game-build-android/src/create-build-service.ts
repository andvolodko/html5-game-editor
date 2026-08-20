import {
  BuildService,
  BuildTargetRegistry,
  ExecFileProcessRunner,
  WebBuildTarget,
  type ProcessRunner,
} from "@game-editor/game-build";
import { AndroidBuildTarget } from "./android-build-target.js";

export function createGameBuildRegistry(): BuildTargetRegistry {
  const registry = new BuildTargetRegistry();
  registry.register(new WebBuildTarget());
  registry.register(new AndroidBuildTarget());
  return registry;
}

export function createGameBuildService(
  processRunner: ProcessRunner = new ExecFileProcessRunner(),
): BuildService {
  return new BuildService({
    registry: createGameBuildRegistry(),
    processRunner,
  });
}
