import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TEMPLATE_URL = new URL("../../templates/index.html", import.meta.url);

export function loadGameIndexHtmlTemplate(): string {
  return readFileSync(fileURLToPath(TEMPLATE_URL), "utf8");
}
