# Collaboration

Multi-user editing, advisory resource locks, and Git as source of truth.

Orientation: [`PROJECT.md`](../PROJECT.md). This area is largely planned; do not implement Google-Docs-style real-time CRDT editing as the initial model. Status: [`roadmap.md`](./roadmap.md).

---

## Collaboration model

The editor should support multiple users working on the same project.

Initial collaboration model:

* shared Git repository;
* separate local checkouts;
* granular scene/prefab files;
* optional resource locking.

Do **not** initially attempt Google-Docs-style real-time CRDT editing.

---

## Resource locking

Locks are advisory/editor-enforced resource locks.

Possible resources: `scene:game`, `scene:bonus`, `prefab:paytable`, `atlas:ui`.

```ts
interface ResourceLock {
  resourceId: string;
  userId: string;
  acquiredAt: number;
  expiresAt: number;
}
```

Flow: open resource for editing → acquire lock → editing enabled. If another user holds the lock, open as read-only.

---

## Lock heartbeat

Locks must expire automatically. The client periodically renews active locks.

Example: heartbeat every ~10 seconds, lock TTL ~30 seconds. Exact values should be configurable.

If the editor crashes or the network disappears, stale locks must eventually expire.

Lock operations: `acquire`, `renew`, `release`, `query`.

The server must validate lock ownership when modifying locked resources.

---

## Git collaboration

Resource locking does not replace Git.

Git remains responsible for history, branches, commits, merges, revert, and collaboration source of truth.

Locks only reduce simultaneous modification conflicts.

Scene JSON should be deterministic and human-diff-friendly. Avoid unnecessary property reordering. Avoid storing generated/transient state in scene files. See [`scene-model.md`](./scene-model.md).
