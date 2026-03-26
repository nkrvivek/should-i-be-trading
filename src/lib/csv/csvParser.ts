/**
 * CSV Parser — wraps d3-dsv with auto-delimiter detection.
 */
import { csvParse, tsvParse } from "d3-dsv";

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  skipped: number;
}

/** Auto-detect delimiter from the first line of content */
function detectDelimiter(content: string): "," | "\t" {
  const firstLine = content.split(/\r?\n/)[0] || "";
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return tabs > commas ? "\t" : ",";
}

/** Parse CSV/TSV content into headers + rows */
export function parseCsvContent(content: string, delimiter?: "," | "\t"): ParseResult {
  const delim = delimiter ?? detectDelimiter(content);
  const parse = delim === "\t" ? tsvParse : csvParse;

  const parsed = parse(content);

  const headers = parsed.columns ?? [];
  const rows: Record<string, string>[] = [];
  let skipped = 0;

  for (const row of parsed) {
    // Skip rows that are entirely empty
    const values = Object.values(row);
    const isEmpty = values.every((v) => !v || v.trim() === "");
    if (isEmpty) {
      skipped++;
      continue;
    }

    // d3-dsv adds a "columns" property — strip it from each row object
    const clean: Record<string, string> = {};
    for (const h of headers) {
      clean[h] = (row[h] ?? "").trim();
    }
    rows.push(clean);
  }

  return {
    headers,
    rows,
    rowCount: rows.length,
    skipped,
  };
}
