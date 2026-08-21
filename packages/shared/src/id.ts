export type Id = string;

const UUID_BYTE_COUNT = 16;
const HEX_RADIX = 16;
const HEX_DIGIT_PAIR_WIDTH = 2;
const BYTE_MAX_EXCLUSIVE = 256;

const UUID_VERSION_BYTE_INDEX = 6;
const UUID_VARIANT_BYTE_INDEX = 8;
const UUID_VERSION_MASK = 0x0f;
const UUID_VERSION_4 = 0x40;
const UUID_VARIANT_MASK = 0x3f;
const UUID_VARIANT_RFC4122 = 0x80;

const UUID_GROUP_END_TIME_LOW = 8;
const UUID_GROUP_END_TIME_MID = 12;
const UUID_GROUP_END_TIME_HI = 16;
const UUID_GROUP_END_CLOCK = 20;

export function createId(prefix?: string): Id {
  const id = createRandomUuid();
  return prefix === undefined ? id : `${prefix}_${id}`;
}

export function assertId(value: unknown, label = "id"): asserts value is Id {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Expected non-empty string ${label}`);
  }
}

/** Prefer `randomUUID`; fall back for older Android WebViews and non-secure HTTP. */
function createRandomUuid(): string {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === "function") {
    return webCrypto.randomUUID();
  }
  return formatUuidV4(fillRandomBytes());
}

function fillRandomBytes(): Uint8Array {
  const bytes = new Uint8Array(UUID_BYTE_COUNT);
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.getRandomValues === "function") {
    webCrypto.getRandomValues(bytes);
    return bytes;
  }
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Math.floor(Math.random() * BYTE_MAX_EXCLUSIVE);
  }
  return bytes;
}

function formatUuidV4(bytes: Uint8Array): string {
  const versionByte = bytes[UUID_VERSION_BYTE_INDEX] ?? 0;
  const variantByte = bytes[UUID_VARIANT_BYTE_INDEX] ?? 0;
  bytes[UUID_VERSION_BYTE_INDEX] = (versionByte & UUID_VERSION_MASK) | UUID_VERSION_4;
  bytes[UUID_VARIANT_BYTE_INDEX] = (variantByte & UUID_VARIANT_MASK) | UUID_VARIANT_RFC4122;

  let hex = "";
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes[i] ?? 0;
    hex += byte.toString(HEX_RADIX).padStart(HEX_DIGIT_PAIR_WIDTH, "0");
  }
  return [
    hex.slice(0, UUID_GROUP_END_TIME_LOW),
    hex.slice(UUID_GROUP_END_TIME_LOW, UUID_GROUP_END_TIME_MID),
    hex.slice(UUID_GROUP_END_TIME_MID, UUID_GROUP_END_TIME_HI),
    hex.slice(UUID_GROUP_END_TIME_HI, UUID_GROUP_END_CLOCK),
    hex.slice(UUID_GROUP_END_CLOCK),
  ].join("-");
}
