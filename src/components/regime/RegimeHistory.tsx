import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { CriHistoryEntry } from "../../api/types";

type Props = {
  history: CriHistoryEntry[];
};

export function RegimeHistory({ history }: Props) {
  const leftRef = useRef<SVGSVGElement>(null);
  const rightRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!leftRef.current || !rightRef.current || !containerRef.current || history.length === 0) return;

    const containerWidth = containerRef.current.clientWidth;
    const width = Math.floor(containerWidth / 2) - 8;
    const height = 200;
    const margin = { top: 16, right: 48, bottom: 24, left: 48 };

    const dates = history.map((d) => new Date(d.date));
    const x = d3.scaleTime()
      .domain(d3.extent(dates) as [Date, Date])
      .range([margin.left, width - margin.right]);

    // Left chart: VIX + VVIX
    renderDualChart(leftRef.current, history, width, height, margin, x, {
      left: { key: "vix", color: "#05AD98", label: "VIX" },
      right: { key: "vvix", color: "#8B5CF6", label: "VVIX" },
    });

    // Right chart: RVOL + COR1M
    renderDualChart(rightRef.current, history, width, height, margin, x, {
      left: { key: "realized_vol", color: "#F5A623", label: "RVOL" },
      right: { key: "cor1m", color: "#D946A8", label: "COR1M" },
    });
  }, [history]);

  if (history.length === 0) return null;

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        gap: 16,
        padding: 16,
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          VIX + VVIX (20 sessions)
        </div>
        <svg ref={leftRef} style={{ width: "100%", height: 200 }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          RVOL + COR1M (20 sessions)
        </div>
        <svg ref={rightRef} style={{ width: "100%", height: 200 }} />
      </div>
    </div>
  );
}

type SeriesConfig = {
  left: { key: string; color: string; label: string };
  right: { key: string; color: string; label: string };
};

function renderDualChart(
  svgEl: SVGSVGElement,
  history: CriHistoryEntry[],
  width: number,
  height: number,
  margin: { top: number; right: number; bottom: number; left: number },
  x: d3.ScaleTime<number, number>,
  series: SeriesConfig,
) {
  const svg = d3.select(svgEl);
  svg.selectAll("*").remove();
  svg.attr("width", width).attr("height", height);

  const leftData = history.map((d) => (d as Record<string, unknown>)[series.left.key] as number);
  const rightData = history.map((d) => (d as Record<string, unknown>)[series.right.key] as number);

  const yLeft = d3.scaleLinear()
    .domain([d3.min(leftData)! * 0.9, d3.max(leftData)! * 1.1])
    .range([height - margin.bottom, margin.top]);

  const yRight = d3.scaleLinear()
    .domain([d3.min(rightData)! * 0.9, d3.max(rightData)! * 1.1])
    .range([height - margin.bottom, margin.top]);

  // Grid
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat((d) => d3.timeFormat("%m/%d")(d as Date)))
    .call((g) => {
      g.select(".domain").attr("stroke", "var(--chart-axis)");
      g.selectAll(".tick text").attr("fill", "var(--text-muted)").attr("font-family", "var(--font-mono)").attr("font-size", "9px");
      g.selectAll(".tick line").attr("stroke", "var(--chart-axis)");
    });

  // Left axis
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yLeft).ticks(4))
    .call((g) => {
      g.select(".domain").remove();
      g.selectAll(".tick text").attr("fill", series.left.color).attr("font-family", "var(--font-mono)").attr("font-size", "9px");
      g.selectAll(".tick line").attr("stroke", "var(--chart-grid)").attr("x2", width - margin.left - margin.right);
    });

  // Right axis
  svg.append("g")
    .attr("transform", `translate(${width - margin.right},0)`)
    .call(d3.axisRight(yRight).ticks(4))
    .call((g) => {
      g.select(".domain").remove();
      g.selectAll(".tick text").attr("fill", series.right.color).attr("font-family", "var(--font-mono)").attr("font-size", "9px");
      g.selectAll(".tick line").remove();
    });

  const dates = history.map((d) => new Date(d.date));

  // Left line
  const lineLeft = d3.line<number>()
    .x((_, i) => x(dates[i]))
    .y((d) => yLeft(d))
    .curve(d3.curveMonotoneX);

  svg.append("path")
    .datum(leftData)
    .attr("fill", "none")
    .attr("stroke", series.left.color)
    .attr("stroke-width", 1.5)
    .attr("d", lineLeft);

  // Right line
  const lineRight = d3.line<number>()
    .x((_, i) => x(dates[i]))
    .y((d) => yRight(d))
    .curve(d3.curveMonotoneX);

  svg.append("path")
    .datum(rightData)
    .attr("fill", "none")
    .attr("stroke", series.right.color)
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "4,2")
    .attr("d", lineRight);

  // Latest dots
  const lastIdx = history.length - 1;
  svg.append("circle")
    .attr("cx", x(dates[lastIdx]))
    .attr("cy", yLeft(leftData[lastIdx]))
    .attr("r", 4)
    .attr("fill", series.left.color);

  svg.append("circle")
    .attr("cx", x(dates[lastIdx]))
    .attr("cy", yRight(rightData[lastIdx]))
    .attr("r", 4)
    .attr("fill", series.right.color);
}
