/**
 * CSV Sanitizer — client-side security validation pipeline.
 * Strips formula injection, HTML tags, dangerous URIs, and enforces limits.
 */

const MAX_FILE_SIZE = 1_048_576; // 1 MB
const MAX_ROWS = 10_000;
const ALLOWED_EXTENSIONS = [".csv", ".tsv", ".txt"];
const ALLOWED_MIMES = [
  "text/csv",
  "text/tab-separated-values",
  "text/plain",
  "application/vnd.ms-excel",
];

const FORMULA_PREFIXES = ["=", "+", "-", "@", "|", "\t"];
const DANGEROUS_URI_RE = /^\s*(javascript|data|vbscript)\s*:/i;
const HTML_TAG_RE = /<\/?[a-z][^>]*>/gi;

export interface SanitizeResult {
  valid: boolean;
  error?: string;
  content?: string;
  warnings: string[];
}

/** Validate file metadata before reading contents */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const name = file.name.toLowerCase();
  const ext = name.slice(name.lastIndexOf("."));

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Unsupported file type "${ext}". Accepted: ${ALLOWED_EXTENSIONS.join(", ")}` };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large (${(file.size / 1024).toFixed(0)} KB). Maximum is 1 MB.` };
  }

  if (file.type && !ALLOWED_MIMES.includes(file.type)) {
    return { valid: false, error: `Unexpected MIME type "${file.type}". Expected a text/CSV file.` };
  }

  return { valid: true };
}

/** Sanitize raw CSV text content */
export function sanitizeContent(raw: string): SanitizeResult {
  const warnings: string[] = [];

  // Strip BOM
  let content = raw.replace(/^\uFEFF/, "");

  // Reject null bytes
  if (content.includes("\0")) {
    return { valid: false, error: "File contains null bytes and cannot be processed.", warnings };
  }

  // Split into lines and parse cells
  const lines = content.split(/\r?\n/);

  if (lines.length > MAX_ROWS + 1) {
    return { valid: false, error: `File has ${lines.length - 1} data rows. Maximum is ${MAX_ROWS}.`, warnings };
  }

  // Detect delimiter from first line
  const firstLine = lines[0] || "";
  const isTab = firstLine.includes("\t") && !firstLine.includes(",");
  const delimiter = isTab ? "\t" : ",";

  const sanitizedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "" && i === lines.length - 1) continue; // skip trailing blank

    const cells = splitCsvLine(line, delimiter);
    const sanitizedCells: string[] = [];

    for (let j = 0; j < cells.length; j++) {
      let cell = cells[j];

      // Check for dangerous URIs — reject cell entirely
      if (DANGEROUS_URI_RE.test(cell)) {
        return { valid: false, error: `Dangerous URI detected in row ${i + 1}, column ${j + 1}. File rejected.`, warnings };
      }

      // Strip formula prefixes
      const originalCell = cell;
      while (cell.length > 0 && FORMULA_PREFIXES.includes(cell[0])) {
        cell = cell.slice(1);
      }
      if (cell !== originalCell) {
        warnings.push(`Formula prefix stripped from row ${i + 1}, column ${j + 1}`);
      }

      // Strip HTML tags (use separate regex to avoid lastIndex issues with global flag)
      const stripped = cell.replace(/<\/?[a-z][^>]*>/gi, "");
      if (stripped !== cell) {
        cell = stripped;
        warnings.push(`HTML tags stripped from row ${i + 1}, column ${j + 1}`);
      }

      sanitizedCells.push(cell);
    }

    sanitizedLines.push(sanitizedCells.map((c) => quoteIfNeeded(c, delimiter)).join(delimiter));
  }

  // Cap warnings to avoid flooding
  if (warnings.length > 50) {
    const total = warnings.length;
    warnings.length = 50;
    warnings.push(`... and ${total - 50} more warnings`);
  }

  return {
    valid: true,
    content: sanitizedLines.join("\n"),
    warnings,
  };
}

/** Naive CSV cell splitter that respects quoted fields */
function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        cells.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  cells.push(current);
  return cells;
}

/** Re-quote a cell value if it contains the delimiter, quotes, or newlines */
function quoteIfNeeded(value: string, delimiter: string): string {
  if (value.includes(delimiter) || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}
