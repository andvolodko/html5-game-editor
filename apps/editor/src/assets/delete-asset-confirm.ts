export function formatDeleteAssetConfirm(names: readonly string[]): {
  title: string;
  description: string;
  confirmLabel: string;
} {
  const confirmLabel = "Delete";
  if (names.length <= 1) {
    const name = names[0] ?? "this asset";
    return {
      title: "Delete asset",
      description: `Delete \u201c${name}\u201d? This can be undone.`,
      confirmLabel,
    };
  }
  return {
    title: "Delete assets",
    description: `Delete ${names.length} assets? This can be undone.`,
    confirmLabel,
  };
}
