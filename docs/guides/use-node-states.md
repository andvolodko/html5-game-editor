# Use node states

Named **property overrides** on nodes. Not a state machine, not animation clips, and not Script `properties`.

Base values stay on the normal node fields (`visible`, `alpha`, `Transform2D`). Each named catalog state stores only the channels that differ. Resolution is always **Base → one active state**. Switching states re-resolves from Base so a previous state’s scale or alpha does not stick.

Scene model: [`scene-model.md`](../scene-model.md#node-states). Editor panel: [`editor.md`](../editor.md#node-states-panel). Runtime: [`runtime.md`](../runtime.md).

---

## What is persisted

The scene catalog (`SceneData.states`) and per-node sparse bags (`SceneNodeData.stateOverrides`). Omit empty maps. State ids are `state_…` (`createId("state")`). Display names are not ids.

```json
{
  "states": [
    { "id": "state_a1b2", "name": "Damaged" },
    {
      "id": "state_c3d4",
      "name": "Portrait",
      "viewport": { "width": 1080, "height": 1920 }
    }
  ],
  "nodes": [
    {
      "id": "node_…",
      "name": "Hero",
      "alpha": 1,
      "stateOverrides": {
        "state_a1b2": { "alpha": 0.5 },
        "state_c3d4": {
          "transform2D": { "position": { "x": 120 } }
        }
      },
      "components": []
    }
  ]
}
```

`viewport` on a catalog entry is an **editor label only** (shown as `1080×1920` in the States list). It does not resize the scene viewport or change `project.json` resolution.

The editor’s **active** state (`NodeStateEditSession`) is **not** written into scene JSON. Preview / standalone start on Base until a script calls `ctx.node.states.set(…)`.

---

## What can be overridden (MVP)

| Channel | Path | Notes |
| --- | --- | --- |
| Visible | `visible` | Same field as Inspector **Visible** |
| Alpha | `alpha` | 0–1 |
| Position | `transform2D.position.x` / `.y` | Per axis; unchanged axes inherit Base |
| Rotation | `transform2D.rotation` | Degrees |
| Scale | `transform2D.scale.x` / `.y` | Per axis |

Not in this milestone: Transform3D, skew, anchor, Script properties, sprite/texture `assetId`, Hit Zone / Mask, pointer fields.

Prefab Apply / Revert does **not** include `stateOverrides`. Duplicate / instantiate / unpack **copies** the bag; ids still refer to the **scene** catalog.

---

## 1. Author states in the editor

The **States** panel is docked with Console / Preview (`EDITOR_PANEL_IDS.states`).

1. Open a scene. Select **Base** (always present). Edit Visible, Alpha, and Transform2D as usual — those writes go to the node’s authored fields.
2. **+ Add State** creates a catalog entry named `State`, selects it, and starts a rename. Or use **Portrait / Landscape** to add those two names (with 1080×1920 / 1920×1080 hints) if missing. Names are presets only; the resolver does not treat them specially.
3. With a named state selected, move the 2D gizmo or commit Inspector fields. Only **changed** channels are stored. The viewport shows the effective pose (Base + that state).
4. Overridden Inspector fields show a **↺ Reset to Base** control. That removes that path from `stateOverrides` and prunes empty objects.
5. Context menu on a named state: **Rename**, **Duplicate** (copies that state’s overrides onto a new catalog id), **Delete** (strips that key from every node). Undo/redo covers catalog and override commands.

While a named state is active, **every** selected Transform2D node you drag writes overrides for that state — not Base. Switch back to **Base** before editing the default pose.

---

## 2. Activate at runtime

Each node has its own live active state. That does not rewrite authored JSON.

```ts
// By unique display name (warns and no-ops if missing or ambiguous)
ctx.node.states.set("Damaged");

// By catalog id
ctx.node.states.set("state_a1b2");

ctx.node.states.setBase();          // authored values
const id = ctx.node.states.active;  // catalog id, or null for Base
```

Lookup: exact catalog `id`, else a **unique** `name`. Unknown or duplicate names log `[node-states] Unknown state "…"` and leave the current overlay.

Apply goes to the renderer (`visible`, `alpha`, live Transform2D). It does not patch `SceneNodeData` Transform2D / alpha / visible.

Other nodes: `ctx.scene` / `ctx.node.children` expose the same `states` API on each handle.

If a behaviour writes `ctx.transform` every `update`, those assignments overwrite the overlay until the next `states.set`. Prefer: set the state when the pose should change, then avoid fighting it on the same axes — or treat live `ctx.transform` as the later layer (animation / motion).

---

## 3. Typical loop

```text
Editor: Base pose → add Damaged → override alpha / scale
        → save scene JSON (catalog + sparse bags)

Runtime: load scene (Base on screen)
        → hit / event → ctx.node.states.set("Damaged")
        → heal → ctx.node.states.setBase()
```

Do not encode Damaged by duplicating the whole node. Do not put class instances or Pixi/Three objects in `stateOverrides`.

---

## Checklist

- Catalog names are unique if scripts will activate by name
- Only MVP channels differ from Base; empty override objects are pruned
- Editor active state is Base when you intend to edit the default pose
- Scripts call `set` / `setBase`; they do not write `stateOverrides` by hand
- Prefab Apply/Revert is not used to sync state bags
- `pnpm --filter @game-editor/scene test` / `pnpm --filter @game-editor/editor-core test` if you change resolver or commands
