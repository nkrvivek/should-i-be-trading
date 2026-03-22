import type { ReactNode } from "react";

export type LayoutPreset = "dashboard" | "flow" | "portfolio" | "full";

type Props = {
  preset: LayoutPreset;
  children: ReactNode;
};

const presetStyles: Record<LayoutPreset, React.CSSProperties> = {
  dashboard: {
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    gridTemplateRows: "1fr",
    gap: 8,
    height: "100%",
  },
  flow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 300px",
    gridTemplateRows: "1fr",
    gap: 8,
    height: "100%",
  },
  portfolio: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gridTemplateRows: "1fr 1fr",
    gap: 8,
    height: "100%",
  },
  full: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gridTemplateRows: "1fr 1fr",
    gap: 8,
    height: "100%",
  },
};

export function PanelGrid({ preset, children }: Props) {
  return <div style={presetStyles[preset]}>{children}</div>;
}
