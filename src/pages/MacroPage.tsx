import { TerminalShell } from "../components/layout/TerminalShell";
import { Panel } from "../components/layout/Panel";
import { YieldCurveChart } from "../components/macro/YieldCurveChart";
import { EconomicCalendar } from "../components/macro/EconomicCalendar";
import { MacroIndicators } from "../components/macro/MacroIndicators";
import { useYieldCurve, useFredSeries } from "../hooks/useFredData";
import { useEconomicCalendar } from "../hooks/useEconomicCalendar";

export function MacroPage() {
  const { data: yieldCurve, loading: ycLoading, refresh: refreshYc } = useYieldCurve();
  const { events, loading: calLoading, refresh: refreshCal } = useEconomicCalendar();

  const cpi = useFredSeries("CPIAUCSL", 13);
  const unemployment = useFredSeries("UNRATE", 13);
  const gdp = useFredSeries("GDP", 8);
  const fedFunds = useFredSeries("FEDFUNDS", 13);

  const macroSeries = [
    { label: "CPI (YoY)", seriesId: "CPIAUCSL", unit: "", observations: cpi.data },
    { label: "Unemployment Rate", seriesId: "UNRATE", unit: "%", observations: unemployment.data },
    { label: "GDP (Billions)", seriesId: "GDP", unit: "B", observations: gdp.data },
    { label: "Fed Funds Rate", seriesId: "FEDFUNDS", unit: "%", observations: fedFunds.data },
  ];

  return (
    <TerminalShell cri={null}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 1200, margin: "0 auto" }}>
        <Panel title="US Treasury Yield Curve" onRefresh={refreshYc} loading={ycLoading}>
          {yieldCurve ? (
            <YieldCurveChart data={yieldCurve} />
          ) : (
            <div style={{ padding: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
              {ycLoading ? "Loading yield curve..." : "Configure Supabase to enable FRED data"}
            </div>
          )}
        </Panel>

        <Panel title="Economic Calendar (High Impact)" onRefresh={refreshCal} loading={calLoading}>
          <EconomicCalendar events={events} />
        </Panel>

        <div style={{ gridColumn: "1 / -1" }}>
          <Panel title="Macro Indicators">
            <MacroIndicators series={macroSeries} />
          </Panel>
        </div>
      </div>
    </TerminalShell>
  );
}
