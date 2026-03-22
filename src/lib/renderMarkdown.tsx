import React from "react";

/** Lightweight markdown-to-JSX renderer for AI responses */
export function renderMarkdown(md: string) {
  const blocks = md.split(/\n{2,}/);

  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed)) {
      return <hr key={i} style={{ border: "none", borderTop: "1px solid var(--border-dim)", margin: "12px 0" }} />;
    }

    // H2 heading
    if (trimmed.startsWith("## ")) {
      return (
        <div key={i} style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--signal-core)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 4,
        }}>
          {trimmed.replace(/^##\s*/, "")}
        </div>
      );
    }

    // Section header (bold-only line like **WHAT'S HAPPENING**)
    const headerMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (headerMatch) {
      const label = headerMatch[1].replace(/^[📊⚡🔍🎯]\s*/, "");
      return (
        <div key={i} style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          color: "var(--signal-strong)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginTop: i > 0 ? 16 : 0,
          marginBottom: 6,
          paddingBottom: 4,
          borderBottom: "1px solid var(--border-dim)",
        }}>
          {label}
        </div>
      );
    }

    // Bullet list
    const lines = trimmed.split("\n");
    if (lines.every((l) => /^[-*]\s/.test(l.trim()))) {
      return (
        <ul key={i} style={{ margin: "0 0 8px 0", paddingLeft: 16, listStyle: "none" }}>
          {lines.map((line, j) => (
            <li key={j} style={{ marginBottom: 4, position: "relative", paddingLeft: 12 }}>
              <span style={{
                position: "absolute",
                left: 0,
                color: "var(--signal-core)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
              }}>
                {"\u25B8"}
              </span>
              {renderInline(line.replace(/^[-*]\s/, ""))}
            </li>
          ))}
        </ul>
      );
    }

    // Multi-line block (could contain mix of bullet and text)
    if (lines.length > 1) {
      return (
        <div key={i} style={{ margin: "0 0 8px 0" }}>
          {lines.map((line, j) => {
            const lt = line.trim();
            if (/^[-*]\s/.test(lt)) {
              return (
                <div key={j} style={{ paddingLeft: 12, marginBottom: 4, position: "relative" }}>
                  <span style={{
                    position: "absolute",
                    left: 0,
                    color: "var(--signal-core)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                  }}>
                    {"\u25B8"}
                  </span>
                  {renderInline(lt.replace(/^[-*]\s/, ""))}
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
        {renderInline(trimmed)}
      </p>
    );
  });
}

/** Render inline markdown: **bold**, *italic*, `code` */
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

  return parts.map((part, i) => {
    // Bold
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} style={{ fontWeight: 600, color: "var(--text-primary)" }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Italic
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return <em key={i} style={{ fontStyle: "italic", color: "var(--text-muted)" }}>{part.slice(1, -1)}</em>;
    }
    // Inline code
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--signal-core)",
          background: "var(--bg-panel-raised)",
          padding: "1px 4px",
          borderRadius: 2,
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
