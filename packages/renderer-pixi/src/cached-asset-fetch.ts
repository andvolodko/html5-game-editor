const buffers = new Map<string, Promise<ArrayBuffer>>();

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
}

/**
 * Fetch a URL once and keep the bytes for later spine/font/audio reads.
 * Caller abort does not cancel a shared in-flight request.
 */
export async function fetchCachedArrayBuffer(
  url: string,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  throwIfAborted(signal);
  let pending = buffers.get(url);
  if (pending === undefined) {
    pending = (async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download ${url}: ${response.status}`);
      }
      return response.arrayBuffer();
    })();
    buffers.set(url, pending);
    pending.catch(() => {
      buffers.delete(url);
    });
  }
  const buffer = await pending;
  throwIfAborted(signal);
  return buffer;
}

export async function fetchCachedText(
  url: string,
  signal?: AbortSignal,
): Promise<string> {
  const buffer = await fetchCachedArrayBuffer(url, signal);
  return new TextDecoder().decode(new Uint8Array(buffer));
}

export async function fetchCachedJson(
  url: string,
  signal?: AbortSignal,
): Promise<unknown> {
  return JSON.parse(await fetchCachedText(url, signal)) as unknown;
}

/** Test-only: drop cached bodies between cases. */
export function resetCachedAssetFetchForTests(): void {
  buffers.clear();
}
