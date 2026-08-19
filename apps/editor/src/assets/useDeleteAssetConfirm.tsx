import { useCallback, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useEditor } from "../editor-context";
import { formatDeleteAssetConfirm } from "./delete-asset-confirm";

type DeletePrompt = {
  names: string[];
  resolve: (confirmed: boolean) => void;
};

export function useDeleteAssetConfirm(): {
  open: boolean;
  confirmDeleteAssets: (assetIds: readonly string[]) => Promise<boolean>;
  dialog: ReactNode;
} {
  const editor = useEditor();
  const [prompt, setPrompt] = useState<DeletePrompt | null>(null);
  const promptRef = useRef<DeletePrompt | null>(null);
  promptRef.current = prompt;

  const confirmDeleteAssets = useCallback(
    (assetIds: readonly string[]): Promise<boolean> => {
      if (assetIds.length === 0) {
        return Promise.resolve(true);
      }
      if (promptRef.current) {
        return Promise.resolve(false);
      }
      const names = assetIds.map((id) => editor.assets.get(id)?.name ?? id);
      return new Promise((resolve) => {
        const next = { names, resolve };
        promptRef.current = next;
        setPrompt(next);
      });
    },
    [editor],
  );

  const close = useCallback((confirmed: boolean) => {
    const current = promptRef.current;
    promptRef.current = null;
    setPrompt(null);
    current?.resolve(confirmed);
  }, []);

  const copy = formatDeleteAssetConfirm(prompt?.names ?? []);

  const dialog = (
    <ConfirmDialog
      open={prompt !== null}
      title={copy.title}
      description={copy.description}
      confirmLabel={copy.confirmLabel}
      confirmClassName="modal-danger"
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );

  return {
    open: prompt !== null,
    confirmDeleteAssets,
    dialog,
  };
}
