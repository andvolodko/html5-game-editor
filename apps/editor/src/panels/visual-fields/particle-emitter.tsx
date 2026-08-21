import { useEffect, useState } from "react";
import type { Editor } from "@game-editor/editor-core";
import {
  DEFAULT_PARTICLE_SPAWN_HEIGHT,
  DEFAULT_PARTICLE_SPAWN_RADIUS,
  DEFAULT_PARTICLE_SPAWN_WIDTH,
  PARTICLE_PRESET_IDS,
  PARTICLE_PRESET_LABELS,
  PARTICLE_SPAWN_SHAPE_TYPES,
  particlePresetToVisualPatch,
  type ParticleEmitterComponentData,
  type ParticlePresetId,
  type ParticleSpawnShape,
} from "@game-editor/scene";
import {
  AssetSelectField,
  BooleanField,
  EnumField,
  InspectorFieldRow,
  NumberField,
} from "../fields/inspector-fields";
import { CurveEditor } from "../fields/curve-editor";
import { ColorGradientEditor } from "../fields/color-gradient-editor";
import type { VisualCommit } from "./types";

const STATS_POLL_MS = 250;

function mergeEmitter(
  visual: ParticleEmitterComponentData,
  patch: Record<string, unknown>,
): ParticleEmitterComponentData {
  return {
    ...visual,
    ...patch,
    emission:
      patch.emission !== undefined
        ? {
            ...visual.emission,
            ...(patch.emission as ParticleEmitterComponentData["emission"]),
          }
        : visual.emission,
  } as ParticleEmitterComponentData;
}

export function ParticleEmitterFields({
  visual,
  commit,
  editor,
  nodeId,
}: {
  visual: ParticleEmitterComponentData;
  commit: VisualCommit;
  editor: Editor;
  nodeId: string;
}) {
  const [presetId, setPresetId] = useState<ParticlePresetId>("fire");
  const [stats, setStats] = useState(() =>
    editor.getParticleEmitterStats(nodeId),
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setStats(editor.getParticleEmitterStats(nodeId));
    }, STATS_POLL_MS);
    return () => window.clearInterval(id);
  }, [editor, nodeId]);

  const preview = (patch: Record<string, unknown>) => {
    editor.previewParticleEmitterConfig(nodeId, mergeEmitter(visual, patch));
  };

  const spawnType = visual.spawn.type;

  return (
    <>
      <AssetSelectField
        label="Texture"
        kind="texture"
        value={visual.assetId}
        onCommit={(assetId) => commit({ assetId })}
      />

      <InspectorFieldRow>
        <button
          type="button"
          onClick={() => editor.controlParticleEmitter(nodeId, "play")}
        >
          Play
        </button>
        <button
          type="button"
          onClick={() => editor.controlParticleEmitter(nodeId, "pause")}
        >
          Pause
        </button>
        <button
          type="button"
          onClick={() => editor.controlParticleEmitter(nodeId, "restart")}
        >
          Restart
        </button>
      </InspectorFieldRow>

      {stats ? (
        <p className="inspector-hint">
          Particles: {stats.alive} / {stats.maxParticles} · Rate: {stats.rate}/s
        </p>
      ) : null}

      <InspectorFieldRow>
        <BooleanField
          label="Play On Start"
          value={visual.playOnStart}
          onCommit={(playOnStart) => commit({ playOnStart })}
        />
        <BooleanField
          label="Loop"
          value={visual.loop}
          onCommit={(loop) => commit({ loop })}
        />
        <BooleanField
          label="Enabled"
          value={visual.enabled !== false}
          onCommit={(enabled) => commit({ enabled })}
        />
      </InspectorFieldRow>

      <InspectorFieldRow>
        <BooleanField
          label="Prewarm"
          value={visual.prewarm}
          onCommit={(prewarm) => commit({ prewarm })}
        />
        <NumberField
          label="Seed"
          value={visual.seed}
          integer
          onCommit={(seed) => commit({ seed })}
        />
      </InspectorFieldRow>

      <InspectorFieldRow>
        <label>
          Preset
          <select
            value={presetId}
            onChange={(event) =>
              setPresetId(event.target.value as ParticlePresetId)
            }
          >
            {PARTICLE_PRESET_IDS.map((id) => (
              <option key={id} value={id}>
                {PARTICLE_PRESET_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => commit(particlePresetToVisualPatch(presetId))}
        >
          Apply
        </button>
      </InspectorFieldRow>

      <h4>Emission</h4>
      <InspectorFieldRow>
        <NumberField
          label="Rate"
          value={visual.emission.rate}
          onCommit={(rate) =>
            commit({ emission: { ...visual.emission, rate } })
          }
        />
        <NumberField
          label="Max Particles"
          value={visual.emission.maxParticles}
          integer
          onCommit={(maxParticles) =>
            commit({ emission: { ...visual.emission, maxParticles } })
          }
        />
      </InspectorFieldRow>
      <NumberField
        label="Duration (0 = infinite)"
        value={visual.emission.duration ?? 0}
        onCommit={(duration) => {
          const next = { ...visual.emission };
          if (duration <= 0) {
            delete next.duration;
          } else {
            next.duration = duration;
          }
          commit({ emission: next });
        }}
      />

      <h4>Lifetime</h4>
      <InspectorFieldRow>
        <NumberField
          label="Min"
          value={visual.lifetime.min}
          onCommit={(min) =>
            commit({ lifetime: { ...visual.lifetime, min } })
          }
        />
        <NumberField
          label="Max"
          value={visual.lifetime.max}
          onCommit={(max) =>
            commit({ lifetime: { ...visual.lifetime, max } })
          }
        />
      </InspectorFieldRow>

      <h4>Spawn</h4>
      <EnumField
        label="Volume"
        value={spawnType}
        options={PARTICLE_SPAWN_SHAPE_TYPES}
        optionLabels={{
          point: "Point",
          circle: "Circle",
          rectangle: "Rectangle",
        }}
        onCommit={(type) => {
          let spawn: ParticleSpawnShape;
          if (type === "circle") {
            spawn = {
              type: "circle",
              radius:
                visual.spawn.type === "circle"
                  ? visual.spawn.radius
                  : DEFAULT_PARTICLE_SPAWN_RADIUS,
            };
          } else if (type === "rectangle") {
            spawn = {
              type: "rectangle",
              width:
                visual.spawn.type === "rectangle"
                  ? visual.spawn.width
                  : DEFAULT_PARTICLE_SPAWN_WIDTH,
              height:
                visual.spawn.type === "rectangle"
                  ? visual.spawn.height
                  : DEFAULT_PARTICLE_SPAWN_HEIGHT,
            };
          } else {
            spawn = { type: "point" };
          }
          commit({ spawn });
        }}
      />
      {visual.spawn.type === "circle" ? (
        <NumberField
          label="Radius"
          value={visual.spawn.radius}
          onCommit={(radius) => commit({ spawn: { type: "circle", radius } })}
        />
      ) : null}
      {visual.spawn.type === "rectangle" ? (
        <InspectorFieldRow>
          <NumberField
            label="Width"
            value={visual.spawn.width}
            onCommit={(width) =>
              commit({
                spawn: {
                  type: "rectangle",
                  width,
                  height:
                    visual.spawn.type === "rectangle"
                      ? visual.spawn.height
                      : DEFAULT_PARTICLE_SPAWN_HEIGHT,
                },
              })
            }
          />
          <NumberField
            label="Height"
            value={visual.spawn.height}
            onCommit={(height) =>
              commit({
                spawn: {
                  type: "rectangle",
                  width:
                    visual.spawn.type === "rectangle"
                      ? visual.spawn.width
                      : DEFAULT_PARTICLE_SPAWN_WIDTH,
                  height,
                },
              })
            }
          />
        </InspectorFieldRow>
      ) : null}

      <h4>Velocity</h4>
      <InspectorFieldRow>
        <NumberField
          label="Speed Min"
          value={visual.velocity.speedMin}
          onCommit={(speedMin) =>
            commit({ velocity: { ...visual.velocity, speedMin } })
          }
        />
        <NumberField
          label="Speed Max"
          value={visual.velocity.speedMax}
          onCommit={(speedMax) =>
            commit({ velocity: { ...visual.velocity, speedMax } })
          }
        />
      </InspectorFieldRow>
      <InspectorFieldRow>
        <NumberField
          label="Angle Min °"
          value={visual.velocity.angleMin}
          onCommit={(angleMin) =>
            commit({ velocity: { ...visual.velocity, angleMin } })
          }
        />
        <NumberField
          label="Angle Max °"
          value={visual.velocity.angleMax}
          onCommit={(angleMax) =>
            commit({ velocity: { ...visual.velocity, angleMax } })
          }
        />
      </InspectorFieldRow>

      <h4>Acceleration</h4>
      <InspectorFieldRow>
        <NumberField
          label="X"
          value={visual.acceleration.x}
          onCommit={(x) =>
            commit({ acceleration: { ...visual.acceleration, x } })
          }
        />
        <NumberField
          label="Y"
          value={visual.acceleration.y}
          onCommit={(y) =>
            commit({ acceleration: { ...visual.acceleration, y } })
          }
        />
      </InspectorFieldRow>

      <CurveEditor
        label="Scale"
        value={visual.scale}
        minValue={0}
        maxValue={2}
        onChange={(scale) => commit({ scale })}
        onPreview={(scale) => preview({ scale })}
      />
      <CurveEditor
        label="Alpha"
        value={visual.alpha}
        minValue={0}
        maxValue={1}
        onChange={(alpha) => commit({ alpha })}
        onPreview={(alpha) => preview({ alpha })}
      />
      <ColorGradientEditor
        label="Color"
        value={visual.color}
        onChange={(color) => commit({ color })}
        onPreview={(color) => preview({ color })}
      />

      <h4>Rotation</h4>
      <InspectorFieldRow>
        <NumberField
          label="Start Min °"
          value={visual.rotation.startMin}
          onCommit={(startMin) =>
            commit({ rotation: { ...visual.rotation, startMin } })
          }
        />
        <NumberField
          label="Start Max °"
          value={visual.rotation.startMax}
          onCommit={(startMax) =>
            commit({ rotation: { ...visual.rotation, startMax } })
          }
        />
      </InspectorFieldRow>
      <InspectorFieldRow>
        <NumberField
          label="Speed Min °/s"
          value={visual.rotation.speedMin}
          onCommit={(speedMin) =>
            commit({ rotation: { ...visual.rotation, speedMin } })
          }
        />
        <NumberField
          label="Speed Max °/s"
          value={visual.rotation.speedMax}
          onCommit={(speedMax) =>
            commit({ rotation: { ...visual.rotation, speedMax } })
          }
        />
      </InspectorFieldRow>
    </>
  );
}
