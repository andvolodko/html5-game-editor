import type { IncomingMessage } from "node:http";
import Busboy from "busboy";
import type { ImportFile } from "../services/asset-importer.js";
import {
  MAX_ASSET_IMPORT_FILE_BYTES,
  MAX_ASSET_IMPORT_FILES,
} from "../import-limits.js";

export interface ParsedMultipartImport {
  destination?: string;
  files: ImportFile[];
}

export function parseAssetImportMultipart(
  req: IncomingMessage,
): Promise<ParsedMultipartImport> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"];
    if (!contentType?.includes("multipart/form-data")) {
      reject(new Error("Expected multipart/form-data"));
      return;
    }

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: MAX_ASSET_IMPORT_FILES,
        fileSize: MAX_ASSET_IMPORT_FILE_BYTES,
      },
    });

    let destination: string | undefined;
    let relativePaths: string[] | undefined;
    const files: ImportFile[] = [];
    const pending: Promise<void>[] = [];
    let failed = false;

    busboy.on("field", (name, value) => {
      if (name === "destination") {
        destination = value;
      }
      if (name === "relativePaths") {
        relativePaths = parseRelativePathsField(value);
      }
    });

    busboy.on("file", (name, file, info) => {
      if (name !== "files" && name !== "file") {
        file.resume();
        return;
      }

      const chunks: Buffer[] = [];
      const task = new Promise<void>((res, rej) => {
        file.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        file.on("limit", () => {
          failed = true;
          rej(new Error(`File too large: ${info.filename}`));
        });
        file.on("error", rej);
        file.on("end", () => {
          files.push({
            fileName: info.filename || "upload.bin",
            bytes: Buffer.concat(chunks),
          });
          res();
        });
      });
      pending.push(task);
    });

    busboy.on("error", reject);
    busboy.on("finish", () => {
      void Promise.all(pending)
        .then(() => {
          if (failed) {
            return;
          }
          resolve({
            ...(destination !== undefined ? { destination } : {}),
            files: applyRelativePaths(files, relativePaths),
          });
        })
        .catch(reject);
    });

    req.pipe(busboy);
  });
}

function parseRelativePathsField(value: string): string[] | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return undefined;
    }
    const paths: string[] = [];
    for (const entry of parsed) {
      if (typeof entry !== "string") {
        return undefined;
      }
      paths.push(entry);
    }
    return paths;
  } catch {
    return undefined;
  }
}

function applyRelativePaths(
  files: ImportFile[],
  relativePaths: string[] | undefined,
): ImportFile[] {
  if (!relativePaths || relativePaths.length !== files.length) {
    return files;
  }
  return files.map((file, index) => {
    const relative = relativePaths[index]?.replace(/\\/g, "/").trim();
    if (!relative) {
      return file;
    }
    return { ...file, fileName: relative };
  });
}
