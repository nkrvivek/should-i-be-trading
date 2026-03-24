import React from "react";

/** Lightweight markdown-to-JSX renderer for AI responses */
export function renderMarkdown(md: string) {
  // Split into blocks, but preserve tables and code blocks as single units
  const lines = md.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let inCodeBlock = false;
  let inTable = false;

  for (const line of lines) {
    // Code block toggle
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        current.push(line);
        blocks.push(current.join("\n"));
        current = [];
        inCodeBlock = false;
      } else {
        if (current.length > 0) blocks.push(current.join("\n"));
        current = [line];
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) { current.push(line); continue; }

    // Table detection
    const isTableLine = /^\|.*\|/.test(line.trim());
    if (isTableLine) {
      if (!inTable) {
        if (current.length > 0) blocks.push(current.join("\n"));
        current = [];
        inTable = true;
      }
      current.push(line);
      continue;
    }
    if (inTable) {
      blocks.push(current.join("\n"));
      current = [];
      inTable = false;
    }

    // Empty line = block separator
    if (line.trim() === "") {
      if (current.length > 0) { blocks.push(current.join("\n")); current = []; }
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current.join("\n"));

  return blocks.map((block, i) => renderBlock(block.trim(), i));
}

function renderBlock(block: string, i: number): React.ReactNode {
  if (!block) return null;

  // Code block
  if (block.startsWith("```")) {
    const lines = block.split("\n");
    const code = lines.slice(1, lines[lines.length - 1]?.trim() === "```" ? -1 : undefined).join("\n");
    return (
      <pre key={i} style={{
        fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.5,
        background: "var(--bg-panel-raised)", border: "1px solid var(--border-dim)",
        borderRadius: 4, padding: "10px 12px", margin: "8px 0",
        overflow: "auto", whiteSpace: "pre-wrap", color: "var(--text-primary)",
      }}>
        {code}
      </pre>
    );
  }

  // Table
  if (/^\|.*\|/.test(block)) {
    return renderTable(block, i);
  }

  // Horizontal rule
  if (/^-{3,}$/.test(block)) {
    return <hr key={i} style={{ border: "none", borderTop: "1px solid var(--border-dim)", margin: "12px 0" }} />;
  }

  // H3 heading
  if (block.startsWith("### ")) {
    return (
      <div key={i} style={{
        fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
        color: "var(--signal-core)", letterSpacing: "0.04em",
        marginTop: i > 0 ? 14 : 0, marginBottom: 6,
      }}>
        {block.replace(/^###\s*/, "").replace(/[⚠️📡🎯📊⚡🔍]/g, "").trim()}
      </div>
    );
  }

  // H2 heading
  if (block.startsWith("## ")) {
    return (
      <div key={i} style={{
        fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600,
        color: "var(--signal-core)", textTransform: "uppercase",
        letterSpacing: "0.04em", marginTop: i > 0 ? 16 : 0, marginBottom: 6,
      }}>
        {block.replace(/^##\s*/, "").replace(/[⚠️📡🎯📊⚡🔍]/g, "").trim()}
      </div>
    );
  }

  // Section header (bold-only line like **WHAT'S HAPPENING**)
  const headerMatch = block.match(/^\*\*(.+?)\*\*$/);
  if (headerMatch) {
    return (
      <div key={i} style={{
        fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
        color: "var(--signal-strong)", textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginTop: i > 0 ? 16 : 0, marginBottom: 6,
        paddingBottom: 4, borderBottom: "1px solid var(--border-dim)",
      }}>
        {headerMatch[1].replace(/^[📊⚡🔍🎯⚠️📡]\s*/, "")}
      </div>
    );
  }

  // Blockquote
  const lines = block.split("\n");
  if (lines.every((l) => l.trim().startsWith(">"))) {
    const content = lines.map((l) => l.trim().replace(/^>\s?/, "")).join("\n");
    return (
      <div key={i} style={{
        borderLeft: "3px solid var(--signal-core)", paddingLeft: 12,
        margin: "8px 0", fontStyle: "italic", color: "var(--text-secondary)",
        fontFamily: "var(--font-sans)", fontSize: 12, lineHeight: 1.5,
      }}>
        {renderInline(content)}
      </div>
    );
  }

  // Bullet list
  if (lines.every((l) => /^[-*▸]\s/.test(l.trim()))) {
    return (
      <ul key={i} style={{ margin: "0 0 8px 0", paddingLeft: 16, listStyle: "none" }}>
        {lines.map((line, j) => (
          <li key={j} style={{ marginBottom: 4, position: "relative", paddingLeft: 12 }}>
            <span style={{
              position: "absolute", left: 0, color: "var(--signal-core)",
              fontFamily: "var(--font-mono)", fontSize: 10,
            }}>
              {"\u25B8"}
            </span>
            {renderInline(line.replace(/^[-*▸]\s/, ""))}
          </li>
        ))}
      </ul>
    );
  }

  // Multi-line block (mixed content)
  if (lines.length > 1) {
    return (
      <div key={i} style={{ margin: "0 0 8px 0" }}>
        {lines.map((line, j) => {
          const lt = line.trim();
          if (/^[-*▸]\s/.test(lt)) {
            return (
              <div key={j} style={{ paddingLeft: 12, marginBottom: 4, position: "relative" }}>
                <span style={{
                  position: "absolute", left: 0, color: "var(--signal-core)",
                  fontFamily: "var(--font-mono)", fontSize: 10,
                }}>
                  {"\u25B8"}
                </span>
                {renderInline(lt.replace(/^[-*▸]\s/, ""))}
              </div>
            );
          }
          if (lt.startsWith(">")) {
            return (
              <div key={j} style={{
                borderLeft: "3px solid var(--signal-core)", paddingLeft: 10,
                fontStyle: "italic", color: "var(--text-secondary)", fontSize: 12, marginBottom: 4,
              }}>
                {renderInline(lt.replace(/^>\s?/, ""))}
              </div>
            );
          }
          return <div key={j}>{renderInline(lt)}</div>;
        })}
      </div>
    );
  }

  // Paragraph
  return (
    <p key={i} style={{ margin: "0 0 8px 0" }}>
      {renderInline(block)}
    </p>
  );
}

/** Render a markdown table */
function renderTable(block: string, key: number): React.ReactNode {
  const rows = block.split("\n").filter((l) => l.trim().length > 0);
  if (rows.length < 2) return null;

  const parseRow = (row: string) =>
    row.split("|").slice(1, -1).map((cell) => cell.trim());

  const headers = parseRow(rows[0]);
  // Skip separator row (|---|---|)
  const startIdx = /^[|\s:-]+$/.test(rows[1]) ? 2 : 1;
  const dataRows = rows.slice(startIdx).map(parseRow);

  return (
    <div key={key} style={{ overflow: "auto", margin: "8px 0" }}>
      <table style={{
        width: "100%", borderCollapse: "collapse",
        fontFamily: "var(--font-mono)", fontSize: 11,
        border: "1px solid var(--border-dim)", borderRadius: 4,
      }}>
        <thead>
          <tr style={{ background: "var(--bg-panel-raised)" }}>
            {headers.map((h, j) => (
              <th key={j} style={{
                padding: "6px 10px", textAlign: "left", fontWeight: 600,
                fontSize: 10, color: "var(--text-secondary)",
                borderBottom: "1px solid var(--border-dim)",
                textTransform: "uppercase", letterSpacing: "0.03em",
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((cells, ri) => (
            <tr key={ri} style={{ borderBottom: "1px solid var(--border-dim)" }}>
              {cells.map((cell, ci) => (
                <td key={ci} style={{
                  padding: "5px 10px", color: "var(--text-primary)",
                }}>
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Render inline markdown: **bold**, *italic*, `code` */
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ fontWeight: 600, color: "var(--text-primary)" }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return <em key={i} style={{ fontStyle: "italic", color: "var(--text-muted)" }}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: "var(--signal-core)", background: "var(--bg-panel-raised)",
          padding: "1px 4px", borderRadius: 2,
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
