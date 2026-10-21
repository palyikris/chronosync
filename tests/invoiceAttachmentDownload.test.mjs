import test from "node:test";
import assert from "node:assert/strict";

import {
  getReportErrorMessage,
  getReportFilename,
} from "../src/utils/invoiceAttachmentDownloadHelpers.ts";

test("download filenames prefer RFC 5987 names and remove unsafe path characters", () => {
  assert.equal(
    getReportFilename(
      "attachment; filename=ignored.xlsx; filename*=UTF-8''invoice%2F2026.xlsx",
    ),
    "invoice_2026.xlsx",
  );
  assert.equal(
    getReportFilename('attachment; filename="../../report.xlsx"'),
    "_.._report.xlsx",
  );
  assert.equal(
    getReportFilename('attachment; filename="CON.xlsx"'),
    "_CON.xlsx",
  );
});

test("download filenames reject malformed encoding and non-xlsx files", () => {
  assert.equal(
    getReportFilename("attachment; filename*=UTF-8''bad%ZZ.xlsx"),
    null,
  );
  assert.equal(
    getReportFilename('attachment; filename="report.pdf"'),
    null,
  );
  assert.equal(getReportFilename(null), null);
});

test("backend error details handle strings and validation arrays", () => {
  assert.equal(getReportErrorMessage({ detail: "Conflict" }), "Conflict");
  assert.equal(
    getReportErrorMessage({ detail: [{ msg: "Invalid date" }, { msg: "Required" }] }),
    "Invalid date Required",
  );
  assert.equal(getReportErrorMessage({ detail: [] }), null);
});
