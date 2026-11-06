const WINDOWS_RESERVED_FILENAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const UNSAFE_FILENAME_CHARACTERS = /[\u202a-\u202e\u2066-\u2069\\/:*?"<>|]/g;

export class NoReportableTimeEntriesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoReportableTimeEntriesError";
  }
}

export const isNoReportableTimeEntriesResponse = (
  status: number,
  payload: unknown,
): boolean =>
  status === 404 &&
  payload !== null &&
  typeof payload === "object" &&
  "detail" in payload &&
  payload.detail ===
    "No approved or previously invoiced time entries were found for the selected clients and date range.";

export const getReportErrorMessage = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const detail = "detail" in payload ? payload.detail : null;
  if (typeof detail === "string") return detail;
  if (!Array.isArray(detail)) return null;

  const messages = detail
    .map((item) =>
      item && typeof item === "object" && "msg" in item
        ? String(item.msg)
        : null,
    )
    .filter((message): message is string => Boolean(message));
  return messages.length > 0 ? messages.join(" ") : null;
};

export const getReportFilename = (
  contentDisposition: string | null,
): string | null => {
  if (!contentDisposition) return null;

  const encodedMatch = contentDisposition.match(
    /filename\*\s*=\s*UTF-8'[^']*'([^;]+)/i,
  );
  const quotedMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i);
  const plainMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
  let rawFilename = quotedMatch?.[1] ?? plainMatch?.[1]?.trim();

  if (encodedMatch?.[1]) {
    try {
      rawFilename = decodeURIComponent(
        encodedMatch[1].trim().replace(/^"|"$/g, ""),
      );
    } catch {
      return null;
    }
  }

  if (!rawFilename) return null;
  let safeFilename = Array.from(rawFilename, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127 ? "_" : character;
  })
    .join("")
    .normalize("NFKC")
    .replace(/^['"]|['"]$/g, "")
    .replace(UNSAFE_FILENAME_CHARACTERS, "_")
    .replace(/^\.+/, "")
    .trim();

  if (!safeFilename.toLowerCase().endsWith(".xlsx")) return null;
  if (WINDOWS_RESERVED_FILENAME.test(safeFilename)) {
    safeFilename = `_${safeFilename}`;
  }

  const extension = ".xlsx";
  if (safeFilename.length > 180) {
    safeFilename = `${safeFilename.slice(0, 180 - extension.length)}${extension}`;
  }

  return safeFilename || null;
};
