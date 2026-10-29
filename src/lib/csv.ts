/**
 * CSV for spreadsheets: a BOM so Excel reads Arabic names, every cell quoted,
 * and cells that start like a formula (= + - @) neutralised.
 */
export function toCsv(rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    let s = String(v);
    // Neutralise spreadsheet formulas in user-controlled text.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}
