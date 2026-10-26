export function serializeCsv(rows: readonly (readonly unknown[])[]): string {
  return "\uFEFF" + rows.map(row => row.map(value => {
    const text = String(value ?? "");
    // Treat spreadsheet formula prefixes as text, including leading whitespace.
    const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, rows: readonly (readonly unknown[])[]) {
  const url = URL.createObjectURL(new Blob([serializeCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
