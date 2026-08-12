import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  isChordLetter,
  isValidSceneFileId,
  type ProjectListEntry,
} from "@game-editor/editor-core";
import { useEditor } from "../editor-context";
import { useEditorState } from "../hooks/useEditorState";
import { useEditorLayoutControls } from "../layout/layout-context";
import { OpenProjectDialog } from "../project/OpenProjectDialog";
import { useUnsavedChangesGuard } from "../unsaved/useUnsavedChangesGuard";

type MenuId = "file" | "edit" | "node";

export function Toolbar() {
  const editor = useEditor();
  const layout = useEditorLayoutControls();
  const scene = useEditorState((ed) => ed.getScene());
  const project = useEditorState((ed) => ed.project.getProject());
  const activeProjectId = useEditorState((ed) =>
    ed.project.getActiveProjectId(),
  );
  const dirty = useEditorState((ed) => ed.getDirtyState());
  const saveError = useEditorState((ed) => ed.getSaveError());
  const canUndo = useEditorState((ed) => ed.commands.canUndo);
  const canRedo = useEditorState((ed) => ed.commands.canRedo);
  const [status, setStatus] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [projectOptions, setProjectOptions] = useState<ProjectListEntry[]>([]);
  const [projectPickerError, setProjectPickerError] = useState<string | null>(
    null,
  );
  const [projectPickerBusy, setProjectPickerBusy] = useState(false);
  const menusRef = useRef<HTMLElement | null>(null);
  const unsaved = useUnsavedChangesGuard();
  const { busy, isBlocked, runGuarded, dialog } = unsaved;

  useEffect(() => editor.bindEditorHotkeys(), [editor]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!editor.hasUnsavedChanges()) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [editor]);

  useEffect(() => {
    if (!openMenu) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const root = menusRef.current;
      if (
        root &&
        event.target instanceof globalThis.Node &&
        root.contains(event.target)
      ) {
        return;
      }
      setOpenMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

  const dirtyLabel =
    dirty === "saving"
      ? "Saving…"
      : dirty === "save-error"
        ? "Save error"
        : dirty === "clean"
          ? "Saved"
          : "Unsaved";

  const closeMenus = () => setOpenMenu(null);

  const toggleMenu = (id: MenuId) => {
    setOpenMenu((current) => (current === id ? null : id));
  };

  const saveScene = () => {
    closeMenus();
    unsaved.setBusy(true);
    setStatus(null);
    void editor
      .saveScene()
      .then(() => setStatus(`Saved ${editor.getSceneFileId()}.json`))
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : "Save failed");
      })
      .finally(() => unsaved.setBusy(false));
  };

  const openScene = useCallback(() => {
    if (isBlocked) {
      return;
    }
    closeMenus();
    setStatus(null);
    void (async () => {
      try {
        const proceeded = await runGuarded(async () => {
          await editor.loadScene();
        });
        if (proceeded) {
          setStatus(`Opened ${editor.getSceneFileId()}.json`);
        }
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "Open failed");
      }
    })();
  }, [editor, isBlocked, runGuarded]);

  const openProjectPicker = useCallback(() => {
    if (isBlocked) {
      return;
    }
    closeMenus();
    setStatus(null);
    setProjectPickerError(null);
    setProjectPickerOpen(true);
    setProjectPickerBusy(true);
    void editor.project
      .listProjects()
      .then((projects) => {
        setProjectOptions(projects);
      })
      .catch((error: unknown) => {
        setProjectOptions([]);
        setProjectPickerError(
          error instanceof Error ? error.message : "Failed to list projects",
        );
      })
      .finally(() => setProjectPickerBusy(false));
  }, [editor, isBlocked]);

  const selectProject = useCallback(
    (projectId: string) => {
      if (isBlocked) {
        return;
      }
      setProjectPickerError(null);
      void (async () => {
        try {
          const proceeded = await runGuarded(async () => {
            setProjectPickerBusy(true);
            await editor.openProject(projectId);
          });
          if (proceeded) {
            setProjectPickerOpen(false);
            const displayName =
              editor.project.getProject()?.displayName ?? projectId;
            setStatus(`Opened project ${displayName}`);
          }
        } catch (error: unknown) {
          setProjectPickerError(
            error instanceof Error ? error.message : "Open project failed",
          );
        } finally {
          setProjectPickerBusy(false);
        }
      })();
    },
    [editor, isBlocked, runGuarded],
  );

  const newScene = useCallback(() => {
    if (isBlocked) {
      return;
    }
    closeMenus();
    setStatus(null);
    void (async () => {
      try {
        let createdId: string | null = null;
        const proceeded = await runGuarded(async () => {
          const defaultId = await editor.allocateSceneFileId();
          const rawId = window.prompt(
            "Scene file name (without .json):",
            defaultId,
          );
          if (rawId === null) {
            return;
          }
          const sceneId = rawId.trim();
          if (sceneId.length === 0) {
            setStatus("Scene name is required");
            return;
          }
          if (!isValidSceneFileId(sceneId)) {
            setStatus(
              "Invalid scene name. Use letters, numbers, dots, underscores, or hyphens.",
            );
            return;
          }

          await editor.createScene(sceneId, sceneId);
          createdId = sceneId;
        });
        if (proceeded && createdId) {
          setStatus(`Created ${createdId}.json`);
        }
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "New scene failed");
      }
    })();
  }, [editor, isBlocked, runGuarded]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (!mod || !isChordLetter(event, "KeyO", "o")) {
        return;
      }
      // Avoid browser "Open file" and editable-field interception.
      event.preventDefault();
      openScene();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openScene]);

  return (
    <header className="toolbar">
      <div className="toolbar-brand">HTML5 Game Editor</div>
      <nav className="toolbar-menubar" ref={menusRef} aria-label="Editor menus">
        <ToolbarMenu
          id="file"
          label="File"
          openMenu={openMenu}
          onToggle={toggleMenu}
        >
          <MenuItem
            disabled={busy || dirty === "saving"}
            onClick={newScene}
          >
            New Scene
          </MenuItem>
          <MenuItem
            disabled={busy || dirty === "saving"}
            shortcut="Ctrl+S"
            onClick={saveScene}
          >
            Save
          </MenuItem>
          <MenuItem
            disabled={busy || dirty === "saving"}
            shortcut="Ctrl+O"
            onClick={openScene}
          >
            Open Scene
          </MenuItem>
          <MenuItem
            disabled={busy || dirty === "saving"}
            onClick={openProjectPicker}
          >
            Open Project…
          </MenuItem>
          <MenuItem
            onClick={() => {
              layout.resetLayout();
              setStatus("Layout reset");
              closeMenus();
            }}
          >
            Reset Layout
          </MenuItem>
        </ToolbarMenu>

        <ToolbarMenu
          id="edit"
          label="Edit"
          openMenu={openMenu}
          onToggle={toggleMenu}
        >
          <MenuItem
            disabled={!canUndo}
            onClick={() => {
              editor.undo();
              closeMenus();
            }}
          >
            Undo
          </MenuItem>
          <MenuItem
            disabled={!canRedo}
            onClick={() => {
              editor.redo();
              closeMenus();
            }}
          >
            Redo
          </MenuItem>
        </ToolbarMenu>

        <ToolbarMenu
          id="node"
          label="Node"
          openMenu={openMenu}
          onToggle={toggleMenu}
        >
          {editor.getNodeTypeRegistry().listMenuGroups().map((group) => (
            <li key={group.category} className="toolbar-menu-submenu" role="none">
              <span className="toolbar-menu-submenu-label">{group.category}</span>
              <ul className="toolbar-menu-submenu-list" role="menu">
                {group.types.map((def) => (
                  <MenuItem
                    key={def.id}
                    onClick={() => {
                      editor.createNode(def.id);
                      closeMenus();
                    }}
                  >
                    {def.label}
                  </MenuItem>
                ))}
              </ul>
            </li>
          ))}
        </ToolbarMenu>
      </nav>
      <div className="toolbar-meta">
        {project ? (
          <>
            <span>{project.displayName}</span>
            <span className="toolbar-sep">·</span>
          </>
        ) : null}
        <span>{scene.name}</span>
        <span className="toolbar-sep">·</span>
        <span>{dirtyLabel}</span>
        {saveError ? (
          <>
            <span className="toolbar-sep">·</span>
            <span>{saveError}</span>
          </>
        ) : null}
        {status ? (
          <>
            <span className="toolbar-sep">·</span>
            <span>{status}</span>
          </>
        ) : null}
      </div>

      <OpenProjectDialog
        open={projectPickerOpen}
        projects={projectOptions}
        activeProjectId={activeProjectId}
        busy={projectPickerBusy || busy}
        error={projectPickerError}
        onClose={() => {
          if (!projectPickerBusy) {
            setProjectPickerOpen(false);
          }
        }}
        onSelect={selectProject}
      />

      {dialog}
    </header>
  );
}

function ToolbarMenu({
  id,
  label,
  openMenu,
  onToggle,
  children,
}: {
  id: MenuId;
  label: string;
  openMenu: MenuId | null;
  onToggle: (id: MenuId) => void;
  children: ReactNode;
}) {
  const open = openMenu === id;
  return (
    <div className={`toolbar-menu${open ? " open" : ""}`}>
      <button
        type="button"
        className="toolbar-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => onToggle(id)}
        onMouseEnter={() => {
          if (openMenu !== null && openMenu !== id) {
            onToggle(id);
          }
        }}
      >
        {label}
      </button>
      {open ? (
        <ul className="toolbar-menu-dropdown" role="menu">
          {children}
        </ul>
      ) : null}
    </div>
  );
}

function MenuItem({
  children,
  disabled,
  shortcut,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        disabled={disabled}
        onClick={onClick}
      >
        <span>{children}</span>
        {shortcut ? <span className="toolbar-menu-shortcut">{shortcut}</span> : null}
      </button>
    </li>
  );
}
