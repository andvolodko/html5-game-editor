import type { Dispatch, SetStateAction } from "react";
import { InspectorFieldRow } from "./fields/inspector-fields";
import type { Transform3DDraft } from "./inspector-transform-commit";

const TRANSFORM_3D_FIELD_ROWS = [
  [
    ["Pos X", "x"],
    ["Pos Y", "y"],
    ["Pos Z", "z"],
  ],
  [
    ["Rot X", "rotX"],
    ["Rot Y", "rotY"],
    ["Rot Z", "rotZ"],
  ],
  [
    ["Scale X", "scaleX"],
    ["Scale Y", "scaleY"],
    ["Scale Z", "scaleZ"],
  ],
] as const;

interface Props {
  draft: Transform3DDraft;
  setDraft: Dispatch<SetStateAction<Transform3DDraft | null>>;
  commit: () => void;
}

export function Transform3DInspector({ draft, setDraft, commit }: Props) {
  return (
    <section className="inspector-section">
      <h3>Transform3D</h3>
      <div className="inspector-grid">
        {TRANSFORM_3D_FIELD_ROWS.map((row) => (
          <InspectorFieldRow key={row.map(([, key]) => key).join("-")}>
            {row.map(([label, key]) => (
              <label key={key}>
                {label}
                <input
                  value={draft[key]}
                  onChange={(event) => {
                    setDraft((current) =>
                      current
                        ? { ...current, [key]: event.target.value }
                        : current,
                    );
                  }}
                  onBlur={commit}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commit();
                    }
                  }}
                />
              </label>
            ))}
          </InspectorFieldRow>
        ))}
      </div>
    </section>
  );
}
