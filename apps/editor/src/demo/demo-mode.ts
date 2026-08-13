/** True when the editor is built/served without project-server (GitHub Pages). */
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO === "true";
}
