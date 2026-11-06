import * as XLSX from "xlsx";
import { PARTNER_IMPORT_LIMIT, suggestPartnerColumns } from "../utils/partnerBillingImport";
import type { PartnerFile } from "../utils/partnerBillingImport";

self.onmessage = (event: MessageEvent<{ buffer: ArrayBuffer; csv: boolean; encoding: string }>) => {
  try {
    const { buffer, csv, encoding } = event.data;
    let input: ArrayBuffer | string = buffer;
    if (csv) {
      try { input = new TextDecoder(encoding === "auto" ? "utf-8" : encoding, { fatal: true }).decode(buffer); }
      catch {
        if (encoding !== "auto") throw new Error("encoding");
        input = new TextDecoder("windows-1250").decode(buffer);
      }
    }
    const workbook = XLSX.read(input, { type: csv ? "string" : "array", sheetRows: PARTNER_IMPORT_LIMIT + 21, raw: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet?.["!ref"]) throw new Error("empty");
    const range = XLSX.utils.decode_range(sheet["!fullref"] ?? sheet["!ref"]);
    if (range.e.r > PARTNER_IMPORT_LIMIT + 20) throw new Error("tooManyRows");
    const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "", blankrows: true,
      range: { s: { r: 0, c: 0 }, e: { r: range.e.r, c: Math.min(range.e.c, 63) } } });
    const headerIndex = matrix.slice(0, 20).map((row, index) => ({ index, score: Object.keys(suggestPartnerColumns(row)).length }))
      .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.index ?? 0;
    const headers = matrix[headerIndex] ?? [];
    while (headers.length && !headers.at(-1)?.trim()) headers.pop();
    if (!headers.length) throw new Error("empty");
    const rows = matrix.slice(headerIndex + 1).flatMap((values, index) => values.some(value => String(value).trim()) ?
      [{ rowNumber: headerIndex + index + 2, values: values.slice(0, headers.length) }] : []);
    if (!rows.length) throw new Error("empty");
    if (rows.length > PARTNER_IMPORT_LIMIT) throw new Error("tooManyRows");
    const result: PartnerFile = { headers, rows, sheetName };
    self.postMessage({ result });
  } catch (error) {
    const known = ["empty", "tooManyRows", "encoding"];
    self.postMessage({ error: error instanceof Error && known.includes(error.message) ? error.message : "invalidFile" });
  }
};
