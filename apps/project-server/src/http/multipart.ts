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
    const files: ImportFile[] = [];
    const pending: Promise<void>[] = [];
    let failed = false;

    busboy.on("field", (name, value) => {
      if (name === "destination") {
        destination = value;
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
            files,
          });
        })
        .catch(reject);
    });

    req.pipe(busboy);
  });
}
