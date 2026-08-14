import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AssetPreviewSelectionValue {
  selectedAssetId: string | undefined;
  setSelectedAssetId: (id: string | undefined) => void;
}

const AssetPreviewSelectionContext =
  createContext<AssetPreviewSelectionValue | null>(null);

export function AssetPreviewSelectionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();
  const value = useMemo(
    () => ({ selectedAssetId, setSelectedAssetId }),
    [selectedAssetId],
  );
  return (
    <AssetPreviewSelectionContext.Provider value={value}>
      {children}
    </AssetPreviewSelectionContext.Provider>
  );
}

export function useAssetPreviewSelection(): AssetPreviewSelectionValue {
  const value = useContext(AssetPreviewSelectionContext);
  if (!value) {
    throw new Error(
      "useAssetPreviewSelection requires AssetPreviewSelectionProvider",
    );
  }
  return value;
}
