import type { GltfAssetUrls } from "@game-editor/assets";
import {
  AmbientLight,
  AnimationMixer,
  Box3,
  Clock,
  Color,
  DirectionalLight,
  LoopRepeat,
  PerspectiveCamera,
  Scene,
  Texture,
  Vector3,
  WebGLRenderer,
  type AnimationAction,
  type AnimationClip,
  type Material,
  type Object3D,
} from "three";
import { loadGltf } from "./load-gltf.js";
import {
  DEFAULT_THREE_BACKGROUND,
  EDITOR_CAMERA_FOV,
} from "./three-constants.js";

const FALLBACK_SIZE = 160;

export interface GltfPreviewHandle {
  setAnimation(name: string | undefined): void;
  setPlaying(playing: boolean): void;
  destroy(): void;
}

function hostSize(parent: HTMLElement): { width: number; height: number } {
  return {
    width: Math.max(1, parent.clientWidth || FALLBACK_SIZE),
    height: Math.max(1, parent.clientHeight || FALLBACK_SIZE),
  };
}

function disposePreviewObject(object: Object3D): void {
  object.traverse((child) => {
    const mesh = child as Object3D & {
      geometry?: { dispose: () => void };
      material?: Material | Material[];
    };
    mesh.geometry?.dispose();
    const materials = mesh.material;
    if (!materials) {
      return;
    }
    const list = Array.isArray(materials) ? materials : [materials];
    for (const material of list) {
      for (const value of Object.values(material)) {
        if (value instanceof Texture) {
          value.dispose();
        }
      }
      material.dispose();
    }
  });
}

function frameObject(camera: PerspectiveCamera, object: Object3D): Vector3 {
  const box = new Box3().setFromObject(object);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const radius = Math.max(size.length() * 0.5, 0.5);
  const distance = radius / Math.sin((camera.fov * Math.PI) / 360);
  camera.near = Math.max(0.01, radius / 100);
  camera.far = Math.max(100, radius * 40);
  camera.position.set(
    center.x + distance * 0.55,
    center.y + distance * 0.4,
    center.z + distance * 0.55,
  );
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  return center;
}

/**
 * Tiny Three.js host for the Asset Preview panel.
 * Reuses the same glTF loader as the scene renderer.
 */
export async function mountGltfPreview(options: {
  parent: HTMLElement;
  urls: GltfAssetUrls;
  animation?: string;
  playing: boolean;
}): Promise<GltfPreviewHandle> {
  const loaded = await loadGltf(options.urls);
  const initial = hostSize(options.parent);
  const scene = new Scene();
  scene.background = new Color(DEFAULT_THREE_BACKGROUND);
  scene.add(new AmbientLight(0xffffff, 0.7));
  const key = new DirectionalLight(0xffffff, 0.9);
  key.position.set(4, 8, 6);
  scene.add(key);

  const camera = new PerspectiveCamera(
    EDITOR_CAMERA_FOV,
    initial.width / initial.height,
    0.1,
    2000,
  );
  const renderer = new WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(initial.width, initial.height, false);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  options.parent.appendChild(renderer.domElement);

  const root = loaded.scene;
  scene.add(root);
  const lookAt = frameObject(camera, root);
  const startOffset = camera.position.clone().sub(lookAt);
  const orbitRadius = Math.hypot(startOffset.x, startOffset.z);
  const orbitHeight = startOffset.y;
  let theta = Math.atan2(startOffset.x, startOffset.z);

  const applyOrbit = (): void => {
    camera.position.set(
      lookAt.x + Math.sin(theta) * orbitRadius,
      lookAt.y + orbitHeight,
      lookAt.z + Math.cos(theta) * orbitRadius,
    );
    camera.lookAt(lookAt);
  };

  let animation = options.animation;
  let playing = options.playing;
  let mixer: AnimationMixer | undefined;
  let action: AnimationAction | undefined;
  const clock = new Clock();

  const applyClip = (): void => {
    mixer?.stopAllAction();
    mixer?.uncacheRoot(root);
    mixer = undefined;
    action = undefined;
    const clips = loaded.animations;
    if (clips.length === 0) {
      return;
    }
    const clip: AnimationClip | undefined =
      (animation
        ? clips.find((entry) => entry.name === animation)
        : undefined) ?? clips[0];
    if (!clip) {
      return;
    }
    mixer = new AnimationMixer(root);
    action = mixer.clipAction(clip);
    action.setLoop(LoopRepeat, Infinity);
    if (playing) {
      action.play();
    } else {
      action.play();
      action.paused = true;
      mixer.update(0);
    }
  };

  applyClip();

  let raf = 0;
  const tick = (): void => {
    const dt = clock.getDelta();
    if (playing) {
      mixer?.update(dt);
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const resize = (): void => {
    const { width, height } = hostSize(options.parent);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(options.parent);

  renderer.domElement.style.touchAction = "none";
  renderer.domElement.style.cursor = "grab";
  let dragging = false;
  let lastX = 0;
  const onPointerDown = (event: PointerEvent): void => {
    dragging = true;
    lastX = event.clientX;
    renderer.domElement.style.cursor = "grabbing";
    renderer.domElement.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (!dragging) {
      return;
    }
    theta += (event.clientX - lastX) * 0.01;
    lastX = event.clientX;
    applyOrbit();
  };
  const onPointerUp = (event: PointerEvent): void => {
    dragging = false;
    renderer.domElement.style.cursor = "grab";
    if (renderer.domElement.hasPointerCapture(event.pointerId)) {
      renderer.domElement.releasePointerCapture(event.pointerId);
    }
  };
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointercancel", onPointerUp);

  return {
    setAnimation(name) {
      animation = name;
      applyClip();
    },
    setPlaying(next) {
      playing = next;
      if (action) {
        action.paused = !next;
      }
    },
    destroy() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      mixer?.stopAllAction();
      mixer?.uncacheRoot(root);
      scene.remove(root);
      disposePreviewObject(root);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
