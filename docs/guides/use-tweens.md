# Use tweens

Animate node **x**, **y**, **rotation** (degrees), **scale**, and **alpha** over time. This is property interpolation. It is separate from glTF clips (`ctx.animations`), Aseprite playback, and particle curves.

Scripts call `ctx.tween`. The runtime drives the clock from `GameRuntime.tick`, so Preview pause and `setPaused` freeze tweens with the rest of the frame. Values are **seconds**. Tweens do not write scene files.

Under the API, `@tweenjs/tween.js` interpolates a plain numeric bag. Each frame that bag is copied onto the live transform and alpha. Game code does not import tween.js or GSAP, and tweens are never stored on Pixi or Three objects.

---

## Move the host node

`to` / `from` / `fromTo` without a node id use the script's own node.

```ts
start(): void {
  this.slide = this.ctx.tween.to({
    x: "+=220",
    duration: 0.8,
    ease: "power2.out",
    yoyo: true,
    repeat: -1,
  });
}

destroy(): void {
  this.slide?.kill();
}
```

`+=n` and `-=n` are relative to the value **when the tween starts** (after `delay`, not when you call `to`). `repeat: -1` loops forever. `repeat: 1` plays one extra time after the first pass. Default duration is `0.5` seconds. Default ease is `power1.out`.

```ts
// Snap to the from value, then ease back to the pose captured at start.
ctx.tween.from({ scale: 0, duration: 0.6, ease: "back.out", yoyo: true, repeat: -1 });

// Explicit endpoints. Playback fields on the destination win.
ctx.tween.fromTo({ alpha: 0 }, { alpha: 1, duration: 0.3, ease: "sine.out" });
```

`scale` sets both axes. `scaleX` / `scaleY` override it when both are set. Alpha is clamped to `0..1`.

A new tween **replaces** older tweens on the same node and the same channels. Do not also write those channels from `update` every frame; the last writer each frame wins.

---

## Another node, and stagger

Pass a node id, or a list. `stagger` is the extra delay between list entries, in seconds.

```ts
const ids = ["node_a", "node_b", "node_c"];
ctx.tween.to(ids, {
  y: "-=80",
  duration: 0.5,
  ease: "power2.out",
  stagger: 0.1,
  yoyo: true,
  repeat: -1,
});
```

`handle.kill()` stops every target from that call. `ctx.tween.kill()` stops every tween and timeline started from that script context. Call it from `destroy()`.

---

## Timeline

Children run on one clock. Omit the position to append after the current end. A number is absolute time in seconds. `"+=n"` / `"-=n"` offset that end (use `"-=0.1"` to overlap the previous child).

```ts
const banner = ctx.scene.findByName("Banner");
if (!banner) {
  return;
}
const intro = ctx.tween.timeline({ repeat: -1 });
intro
  .to(banner.id, { x: "+=160", duration: 0.45, ease: "power2.out" })
  .to(banner.id, { rotation: "+=180", duration: 0.45, ease: "power2.inOut" })
  .to(banner.id, { x: "-=160", duration: 0.45, ease: "power2.in" }, "-=0.1");
```

`timeline({ yoyo: true })` plays the sequence backward on the next cycle. `timeline({ delay: 0.2 })` waits before the first cycle only.

---

## Easing

Names follow GSAP. `power1` is quadratic, `power2` cubic, `power3` quartic, `power4` quintic. Each of `power1`–`power4`, `sine`, `expo`, `circ`, `back`, `elastic`, and `bounce` has `.in`, `.out`, and `.inOut`. `linear` is constant speed.

`back`, `elastic`, and `bounce` overshoot scale and position. Alpha is still clamped.

---

## Callbacks and lifetime

`onStart`, `onUpdate`, and `onComplete` are optional. A throw is logged and does not stop the frame.

```ts
ctx.tween.to({
  alpha: 0,
  duration: 0.4,
  onComplete: () => {
    ctx.node.visible = false;
  },
});
```

Reloading a scene drops every tween. A tween started in `start()` moves on the first `tick`.
