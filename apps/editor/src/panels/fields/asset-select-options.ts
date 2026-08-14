import type { AssetRecord, AssetType } from "@game-editor/assets";

export const ASSET_SELECT_NONE_VALUE = "";
export const ASSET_SELECT_NONE_LABEL = "(none)";

export interface AssetSelectOption {
  value: string;
  label: string;
}

/**
 * Builds <select> options for a given asset kind.
 * Keeps an orphan current id visible so a missing catalogue entry is not cleared.
 */
export function buildAssetSelectOptions(
  assets: readonly AssetRecord[],
  kind: AssetType | readonly AssetType[],
  currentId: string | undefined,
): AssetSelectOption[] {
  const kinds = new Set(Array.isArray(kind) ? kind : [kind]);
  const matching = assets
    .filter((asset) => kinds.has(asset.type))
    .slice()
    .sort(
      (a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path),
    );

  const options: AssetSelectOption[] = matching.map((asset) => ({
    value: asset.id,
    label: `${asset.name} (${asset.path})`,
  }));

  if (
    currentId !== undefined &&
    currentId.length > 0 &&
    !matching.some((asset) => asset.id === currentId)
  ) {
    options.unshift({
      value: currentId,
      label: `(missing) ${currentId}`,
    });
  }

  return options;
}
