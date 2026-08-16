# project-server

Local Node.js server used by the browser editor for filesystem, import, and save.

Orientation: [`PROJECT.md`](../PROJECT.md). Asset pipeline: [`assets.md`](./assets.md). Route-level security: `.cursor/rules/server-security.mdc`.

---

## Responsibilities

* project filesystem;
* asset import, deletion, move, rename;
* scene loading/saving;
* prefab create/load/save (`POST /prefabs`, `GET|PUT /prefabs/:assetId`);
* asset processing;
* spritesheet generation;
* Aseprite / LibreSprite compile (editor-only CLI; `postinstall` vendors LibreSprite);
* file watching;
* collaboration;
* resource locking;
* project discovery;
* build orchestration where necessary.

The browser must never receive arbitrary unrestricted filesystem access. All filesystem paths must be validated relative to the opened project root. Prevent path traversal.

`project-server` defaults to `games/editor-features-demo`. Override with `PROJECT_ROOT`. Game discovery uses `GAMES_ROOT` (default `games/`).

---

## Security

The project server handles filesystem operations and therefore must treat browser input as untrusted.

Required:

* normalize paths;
* constrain operations to project root;
* block path traversal;
* validate uploads;
* sanitize filenames as necessary;
* avoid arbitrary command execution endpoints.

Never expose a generic API such as `POST /execute-shell-command` to the editor frontend.

Route-level path confinement, upload limits, atomic writes, and CORS rules live in `.cursor/rules/server-security.mdc`. UI and renderer packages must not spawn `child_process`; CLI detection and Aseprite export live in `apps/project-server`.
