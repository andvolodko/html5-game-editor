import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { clampMenuPosition } from "./clamp-menu-position";

export function EditorContextMenu({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState({ x, y });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) {
      return;
    }

    const update = () => {
      const rect = menu.getBoundingClientRect();
      const next = clampMenuPosition({
        x,
        y,
        width: rect.width,
        height: rect.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
      setPosition((prev) =>
        prev.x === next.x && prev.y === next.y ? prev : next,
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(menu);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [x, y]);

  return createPortal(
    <ul
      ref={menuRef}
      className="hierarchy-context-menu"
      style={{ left: position.x, top: position.y }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {children}
    </ul>,
    document.body,
  );
}
