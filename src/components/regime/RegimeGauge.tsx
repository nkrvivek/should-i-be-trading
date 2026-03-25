import { useEffect, useRef } from "react";
import * as d3 from "d3";

type Props = {
  score: number;
  level: string;
};

function gaugeColor(score: number): string {
  if (score < 25) return "var(--positive)";
  if (score < 50) return "var(--warning)";
  if (score < 75) return "var(--negative)";
  return "var(--fault)";
}

export function RegimeGauge({ score, level }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 180;
    const height = 120;
    const radius = 70;
    const thickness = 10;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height - 10})`);

    const startAngle = -Math.PI / 2;
    const endAngle = Math.PI / 2;

    // Background arc
    const bgArc = d3.arc<unknown>()
      .innerRadius(radius - thickness)
      .outerRadius(radius)
      .startAngle(startAngle)
      .endAngle(endAngle);

    g.append("path")
      .attr("d", bgArc({}) as string)
      .attr("fill", "var(--border-dim)");

    // Value arc
    const valueAngle = startAngle + (score / 100) * (endAngle - startAngle);
    const valueArc = d3.arc<unknown>()
      .innerRadius(radius - thickness)
      .outerRadius(radius)
      .startAngle(startAngle)
      .endAngle(valueAngle);

    g.append("path")
      .attr("d", valueArc({}) as string)
      .attr("fill", gaugeColor(score));

    // Score text
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-16")
      .attr("fill", gaugeColor(score))
      .attr("font-family", "var(--font-mono)")
      .attr("font-size", "28px")
      .attr("font-weight", "600")
      .text(score.toFixed(1));

    // Level label
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "2")
      .attr("fill", "var(--text-muted)")
      .attr("font-family", "var(--font-mono)")
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.05em")
      .text(level);
  }, [score, level]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 16,
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 4,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 8,
        }}
      >
        Crash Risk Index
      </div>
      <svg ref={svgRef} />
    </div>
  );
}
