const ICON_SIZE = 14;

export function EyeIcon({ off = false }: { off?: boolean }) {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 16 16"
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M8 3.2C4.4 3.2 1.5 5.5.4 8c1.1 2.5 4 4.8 7.6 4.8S14.5 10.5 15.6 8C14.5 5.5 11.6 3.2 8 3.2zm0 8A3.2 3.2 0 1 1 8 4.8a3.2 3.2 0 0 1 0 6.4zM8 6.1A1.9 1.9 0 1 0 8 9.9 1.9 1.9 0 0 0 8 6.1z"
      />
      {off ? (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          d="M3 13.2 13 2.8"
        />
      ) : null}
    </svg>
  );
}

export function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 16 16"
      aria-hidden
      focusable="false"
    >
      {locked ? (
        <path
          fill="currentColor"
          d="M12.2 7.1V5.6a4.2 4.2 0 0 0-8.4 0v1.5H2.6v7.3h10.8V7.1h-1.2zM5.5 5.6a2.5 2.5 0 0 1 5 0v1.5h-5V5.6z"
        />
      ) : (
        <path
          fill="currentColor"
          d="M12.2 7.1V5.2a4.2 4.2 0 0 0-8.1-1.6l1.5.6a2.5 2.5 0 0 1 4.9 1v1.9H2.6v7.3h10.8V7.1h-1.2z"
        />
      )}
    </svg>
  );
}
