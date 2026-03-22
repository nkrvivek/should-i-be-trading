import { useEffect, useRef } from "react";
import * as d3 from "d3";

type Props = {
  data: Record<string, number>;
};

const MATURITIES = ["1M", "3M", "6M", "1Y", "2Y", "5Y", "10Y", "30Y"];

export function YieldCurveChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || Object.keys(data).length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 400;
    const height = 200;
    const margin = { top: 16, right: 16, bottom: 28, left: 40 };

    svg.attr("width", width).attr("height", height);

    const points = MATURITIES.filter((m) => data[m] != null).map((m, i) => ({
      label: m,
      rate: data[m],
      index: i,
    }));

    const x = d3.scalePoint()
      .domain(points.map((p) => p.label))
      .range([margin.left, width - margin.right])
      .padding(0.5);

    const y = d3.scaleLinear()
      .domain([
        Math.min(...points.map((p) => p.rate)) - 0.2,
        Math.max(...points.map((p) => p.rate)) + 0.2,
      ])
      .range([height - margin.bottom, margin.top]);

    // X axis
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .call((g) => {
        g.select(".domain").attr("stroke", "var(--chart-axis)");
        g.selectAll(".tick text").attr("fill", "var(--text-muted)").attr("font-family", "var(--font-mono)").attr("font-size", "9px");
        g.selectAll(".tick line").attr("stroke", "var(--chart-axis)");
      });

    // Y axis
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat((d) => `${d}%`))
      .call((g) => {
        g.select(".domain").remove();
        g.selectAll(".tick text").attr("fill", "var(--text-muted)").attr("font-family", "var(--font-mono)").attr("font-size", "9px");
        g.selectAll(".tick line").attr("stroke", "var(--chart-grid)").attr("x2", width - margin.left - margin.right);
      });

    // Line
    const line = d3.line<(typeof points)[0]>()
      .x((d) => x(d.label)!)
      .y((d) => y(d.rate))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(points)
      .attr("fill", "none")
      .attr("stroke", "var(--signal-core)")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Dots
    svg.selectAll("circle")
      .data(points)
      .join("circle")
      .attr("cx", (d) => x(d.label)!)
      .attr("cy", (d) => y(d.rate))
      .attr("r", 3)
      .attr("fill", "var(--signal-core)");

    // Rate labels
    svg.selectAll(".rate-label")
      .data(points)
      .join("text")
      .attr("x", (d) => x(d.label)!)
      .attr("y", (d) => y(d.rate) - 10)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--text-secondary)")
      .attr("font-family", "var(--font-mono)")
      .attr("font-size", "9px")
      .text((d) => `${d.rate.toFixed(2)}%`);
  }, [data]);

  return <svg ref={svgRef} style={{ width: "100%", height: 200 }} />;
}
