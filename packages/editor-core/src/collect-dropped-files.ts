/**
 * OS folder drops do not put nested files in `DataTransfer.files`.
 * Chromium/Firefox expose them through `webkitGetAsEntry()` instead.
 */

const droppedUploadNames = new WeakMap<File, string>();

export interface DroppedFileEntry {
  readonly kind: "file";
  readonly name: string;
  file(): Promise<File>;
}

export interface DroppedDirectoryEntry {
  readonly kind: "directory";
  readonly name: string;
  readEntries(): Promise<readonly DroppedFsEntry[]>;
}

export type DroppedFsEntry = DroppedFileEntry | DroppedDirectoryEntry;

/** Multipart filename: dropped relative path when present, otherwise `File.name`. */
export function droppedFileUploadName(file: File): string {
  const remembered = droppedUploadNames.get(file);
  if (remembered) {
    return remembered;
  }
  const relative = file.webkitRelativePath.replace(/\\/g, "/").trim();
  return relative.length > 0 ? relative : file.name;
}

export function droppedFolderPaths(
  files: readonly File[],
  destination: string,
): string[] {
  const folders = new Set<string>([destination]);
  for (const file of files) {
    const relative = droppedFileUploadName(file).replace(/\\/g, "/");
    const parts = relative.split("/").filter((part) => part.length > 0);
    parts.pop();
    let current = destination;
    for (const part of parts) {
      current = `${current}/${part}`;
      folders.add(current);
    }
  }
  return [...folders];
}

export async function collectFilesFromDroppedEntries(
  entries: readonly DroppedFsEntry[],
): Promise<File[]> {
  const files: File[] = [];
  for (const entry of entries) {
    await appendDroppedEntryFiles(entry, "", files);
  }
  return files;
}

export async function collectDroppedFiles(
  dataTransfer: DataTransfer,
): Promise<File[]> {
  const fallback = [...dataTransfer.files];
  const entries = snapshotDroppedEntries(dataTransfer);
  if (entries.length === 0) {
    return fallback;
  }
  const files = await collectFilesFromDroppedEntries(entries);
  return files.length > 0 ? files : fallback;
}

function rememberDroppedUploadName(file: File, relativePath: string): File {
  droppedUploadNames.set(file, relativePath.replace(/\\/g, "/"));
  return file;
}

function snapshotDroppedEntries(dataTransfer: DataTransfer): DroppedFsEntry[] {
  const entries: DroppedFsEntry[] = [];
  for (let index = 0; index < dataTransfer.items.length; index += 1) {
    const item = dataTransfer.items[index];
    if (!item || item.kind !== "file") {
      continue;
    }
    const entry = item.webkitGetAsEntry();
    const dropped = entry ? fromDomEntry(entry) : undefined;
    if (dropped) {
      entries.push(dropped);
    }
  }
  return entries;
}

function fromDomEntry(entry: FileSystemEntry): DroppedFsEntry | undefined {
  if (isFileSystemDirectoryEntry(entry)) {
    return {
      kind: "directory",
      name: entry.name,
      readEntries: async () => {
        const children = await readAllDirectoryEntries(entry);
        return children.flatMap((child) => {
          const dropped = fromDomEntry(child);
          return dropped ? [dropped] : [];
        });
      },
    };
  }
  if (!isFileSystemFileEntry(entry)) {
    return undefined;
  }
  const fileEntry = entry;
  return {
    kind: "file",
    name: fileEntry.name,
    file: () =>
      new Promise((resolve, reject) => {
        fileEntry.file(resolve, reject);
      }),
  };
}

function isFileSystemDirectoryEntry(
  entry: FileSystemEntry,
): entry is FileSystemDirectoryEntry {
  return entry.isDirectory;
}

function isFileSystemFileEntry(
  entry: FileSystemEntry,
): entry is FileSystemFileEntry {
  return entry.isFile;
}

function readAllDirectoryEntries(
  directory: FileSystemDirectoryEntry,
): Promise<FileSystemEntry[]> {
  const reader = directory.createReader();
  const entries: FileSystemEntry[] = [];

  const readNextBatch = (): Promise<void> =>
    new Promise((resolve, reject) => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve();
          return;
        }
        entries.push(...batch);
        resolve(readNextBatch());
      }, reject);
    });

  return readNextBatch().then(() => entries);
}

async function appendDroppedEntryFiles(
  entry: DroppedFsEntry,
  prefix: string,
  files: File[],
): Promise<void> {
  const relativePath = prefix.length > 0 ? `${prefix}/${entry.name}` : entry.name;
  if (entry.kind === "file") {
    const file = await entry.file();
    files.push(rememberDroppedUploadName(file, relativePath));
    return;
  }
  const children = await entry.readEntries();
  for (const child of children) {
    await appendDroppedEntryFiles(child, relativePath, files);
  }
}
