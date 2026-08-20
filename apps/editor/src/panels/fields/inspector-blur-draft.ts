import { useLayoutEffect, useRef, useState } from "react";
import { useInspectorSelectionIdentity } from "./use-inspector-selection-identity";

/**
 * Hierarchy selects on pointerdown, then the focused input blurs. The edit
 * session is the node that was focused; layout cleanup flushes that session
 * before the new node's values paint, and the leftover blur is a no-op.
 */
export function useInspectorBlurDraft<TBound>(
  committedDisplay: string,
  bound: TBound,
  flush: (draft: string, bound: TBound) => void,
): {
  draft: string;
  setDraft: (value: string) => void;
  beginEdit: () => void;
  commit: () => void;
} {
  const identity = useInspectorSelectionIdentity();
  const boundRef = useRef(bound);
  boundRef.current = bound;
  const flushRef = useRef(flush);
  flushRef.current = flush;
  const sessionRef = useRef<TBound | null>(null);
  const [draft, setDraft] = useState(committedDisplay);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const beginEdit = () => {
    if (sessionRef.current === null) {
      sessionRef.current = boundRef.current;
    }
  };

  const commit = () => {
    const session = sessionRef.current;
    if (session === null) {
      return;
    }
    sessionRef.current = null;
    flushRef.current(draftRef.current, session);
  };

  useLayoutEffect(() => {
    setDraft(committedDisplay);
    return () => {
      const session = sessionRef.current;
      if (session === null) {
        return;
      }
      sessionRef.current = null;
      flushRef.current(draftRef.current, session);
    };
  }, [identity, committedDisplay]);

  return { draft, setDraft, beginEdit, commit };
}
