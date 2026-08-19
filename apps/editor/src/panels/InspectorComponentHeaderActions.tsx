interface InspectorComponentHeaderActionsProps {
  onCopy: () => void;
  onRemove: () => void;
}

export function InspectorComponentHeaderActions({
  onCopy,
  onRemove,
}: InspectorComponentHeaderActionsProps) {
  return (
    <div className="inspector-section-header-actions">
      <button type="button" className="inspector-remove-btn" onClick={onCopy}>
        Copy
      </button>
      <button type="button" className="inspector-remove-btn" onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}
