import { useEffect, useRef } from "react";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";

const CLOCK_PAD_LENGTH = 2;

function padClockPart(value: number): string {
  return String(value).padStart(CLOCK_PAD_LENGTH, "0");
}

function formatLogClock(timestamp: number): string {
  const date = new Date(timestamp);
  return `${padClockPart(date.getHours())}:${padClockPart(date.getMinutes())}:${padClockPart(date.getSeconds())}`;
}

export function ConsolePanel() {
  const editor = useEditor();
  const entries = useEditorState((ed) => ed.console.getEntries());
  const listRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    list.scrollTop = list.scrollHeight;
  }, [entries]);

  return (
    <div className="panel panel-console">
      <div className="console-toolbar">
        <button
          type="button"
          className="scene-toolbar-btn"
          disabled={entries.length === 0}
          onClick={() => editor.console.clear()}
        >
          Clear
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="panel-empty">No log messages</p>
      ) : (
        <ol className="console-log" ref={listRef}>
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={`console-log-row console-log-${entry.level}`}
            >
              <time dateTime={new Date(entry.timestamp).toISOString()}>
                {formatLogClock(entry.timestamp)}
              </time>
              <span className="console-log-category">{entry.category}</span>
              <span className="console-log-message">{entry.message}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
