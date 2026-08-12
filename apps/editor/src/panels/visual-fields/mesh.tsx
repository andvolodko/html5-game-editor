import { Fragment } from "react";
import type { VisualComponentData } from "@game-editor/scene";
import {
  AssetSelectField,
  BooleanField,
  NumberField,
} from "../fields/inspector-fields";
import type { VisualCommit } from "./types";

export function MeshSimpleFields({
  visual,
  commit,
}: {
  visual: Extract<VisualComponentData, { type: "MeshSimple" }>;
  commit: VisualCommit;
}) {
  return (
    <>
      <AssetSelectField
        label="Texture"
        kind="texture"
        value={visual.assetId}
        onCommit={(assetId) => commit({ assetId })}
      />
      <BooleanField
        label="Auto Update"
        value={visual.autoUpdate}
        onCommit={(autoUpdate) => commit({ autoUpdate })}
      />
      <p className="panel-hint">
        Vertices / UVs / indices use defaults. Visual vertex editing is out of
        scope.
      </p>
    </>
  );
}

export function MeshRopeFields({
  visual,
  commit,
}: {
  visual: Extract<VisualComponentData, { type: "MeshRope" }>;
  commit: VisualCommit;
}) {
  return (
    <>
      <AssetSelectField
        label="Texture"
        kind="texture"
        value={visual.assetId}
        onCommit={(assetId) => commit({ assetId })}
      />
      <NumberField
        label="Texture Scale"
        value={visual.textureScale}
        onCommit={(textureScale) => commit({ textureScale })}
      />
      <BooleanField
        label="Auto Update"
        value={visual.autoUpdate}
        onCommit={(autoUpdate) => commit({ autoUpdate })}
      />
    </>
  );
}

export function MeshPlaneFields({
  visual,
  commit,
}: {
  visual: Extract<VisualComponentData, { type: "MeshPlane" }>;
  commit: VisualCommit;
}) {
  return (
    <>
      <AssetSelectField
        label="Texture"
        kind="texture"
        value={visual.assetId}
        onCommit={(assetId) => commit({ assetId })}
      />
      <NumberField label="Width" value={visual.width} onCommit={(width) => commit({ width })} />
      <NumberField label="Height" value={visual.height} onCommit={(height) => commit({ height })} />
      <NumberField
        label="Vertices X"
        value={visual.verticesX}
        integer
        onCommit={(verticesX) => commit({ verticesX })}
      />
      <NumberField
        label="Vertices Y"
        value={visual.verticesY}
        integer
        onCommit={(verticesY) => commit({ verticesY })}
      />
    </>
  );
}

export function PerspectiveMeshFields({
  visual,
  commit,
}: {
  visual: Extract<VisualComponentData, { type: "PerspectiveMesh" }>;
  commit: VisualCommit;
}) {
  return (
    <>
      <AssetSelectField
        label="Texture"
        kind="texture"
        value={visual.assetId}
        onCommit={(assetId) => commit({ assetId })}
      />
      <NumberField label="Width" value={visual.width} onCommit={(width) => commit({ width })} />
      <NumberField label="Height" value={visual.height} onCommit={(height) => commit({ height })} />
      {visual.corners.map((corner, index) => (
        <Fragment key={index}>
          <NumberField
            label={`Corner ${index} X`}
            value={corner.x}
            onCommit={(x) => {
              const corners = visual.corners.map((c) => ({ ...c })) as typeof visual.corners;
              corners[index] = { x, y: corner.y };
              commit({ corners });
            }}
          />
          <NumberField
            label={`Corner ${index} Y`}
            value={corner.y}
            onCommit={(y) => {
              const corners = visual.corners.map((c) => ({ ...c })) as typeof visual.corners;
              corners[index] = { x: corner.x, y };
              commit({ corners });
            }}
          />
        </Fragment>
      ))}
    </>
  );
}

export function MeshFields({
  visual,
  commit,
}: {
  visual: Extract<VisualComponentData, { type: "Mesh" }>;
  commit: VisualCommit;
}) {
  return (
    <>
      <AssetSelectField
        label="Texture"
        kind="texture"
        value={visual.assetId}
        onCommit={(assetId) => commit({ assetId })}
      />
      <p className="panel-hint">
        Default textured quad. Custom shaders are out of scope.
      </p>
    </>
  );
}
