import { useState } from "react";

type BottomTab = "console" | "preview";

export function BottomPanel() {
  const [tab, setTab] = useState<BottomTab>("console");

  return (
    <div className="panel bottom-panel">
      <div className="bottom-tabs">
        <button
          type="button"
          className={tab === "console" ? "active" : undefined}
          onClick={() => setTab("console")}
        >
          Console
        </button>
        <button
          type="button"
          className={tab === "preview" ? "active" : undefined}
          onClick={() => setTab("preview")}
        >
          Preview
        </button>
      </div>
      <div className="bottom-body">
        {tab === "console" ? (
          <p className="panel-empty">No log messages</p>
        ) : (
          <p className="panel-empty">Game preview placeholder</p>
        )}
      </div>
    </div>
  );
}
