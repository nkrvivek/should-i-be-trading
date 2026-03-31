import { Suspense, lazy, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TerminalShell } from "../components/layout/TerminalShell";
import { getAcademyViewState, saveAcademyViewState } from "../lib/academyViewState";
import { WorkflowHandoffCard } from "../components/shared/WorkflowHandoffCard";

const AcademyView = lazy(() => import("../components/learn/AcademyView").then((m) => ({ default: m.AcademyView })));
const GlossaryView = lazy(() => import("../components/learn/GlossaryView").then((m) => ({ default: m.GlossaryView })));

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

const learnLoader = (
  <div style={{ padding: 48, textAlign: "center", ...mono, fontSize: 13, color: "var(--text-muted)" }}>
    Loading learn content...
  </div>
);

export function GlossaryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const deepLinkTerm = searchParams.get("term") ?? "";
  const startsInGlossary = Boolean(searchQuery || deepLinkTerm);
  const [manualActiveView, setManualActiveView] = useState<"academy" | "glossary">(() => {
    const persisted = getAcademyViewState();
    if (startsInGlossary) return "glossary";
    return persisted.activeView;
  });
  const activeView = startsInGlossary ? "glossary" : manualActiveView;

  const handleChangeView = (nextView: "academy" | "glossary") => {
    setManualActiveView(nextView);
    saveAcademyViewState({
      ...getAcademyViewState(),
      activeView: nextView,
    });
  };

  return (
    <TerminalShell cri={null}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ ...mono, fontSize: 24, fontWeight: 700, marginBottom: 8 }}>LEARN</h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 600 }}>
            Free trading education inside SIBT: guided lessons, simulator-first strategy walkthroughs, badge paths, and the glossary that powers the rest of the product.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <LearnTabButton active={activeView === "academy"} onClick={() => handleChangeView("academy")}>
            Academy
          </LearnTabButton>
          <LearnTabButton active={activeView === "glossary"} onClick={() => handleChangeView("glossary")}>
            Glossary
          </LearnTabButton>
        </div>

        <div style={{ marginBottom: 20 }}>
          <WorkflowHandoffCard
            eyebrow="Next Step"
            title={activeView === "academy" ? "Practice what you just learned." : "Apply the term inside a real workflow."}
            body={activeView === "academy"
              ? "Move from concept into simulator or research while the lesson is still fresh. The goal is to build a repeatable flow, not to keep reading forever."
              : "Once the glossary term is clear, jump back into the screener, simulator, or trading review flow and use it in context."}
            actions={[
              {
                label: activeView === "academy" ? "Open Simulator" : "Open Composite",
                onClick: () => navigate(activeView === "academy" ? "/signals?tab=practice&view=simulator" : "/research?tab=composite"),
              },
              {
                label: "Open Research",
                onClick: () => navigate("/research"),
                tone: "secondary",
              },
            ]}
          />
        </div>

        <Suspense fallback={learnLoader}>
          {activeView === "academy" ? (
            <AcademyView onOpenGlossary={() => handleChangeView("glossary")} />
          ) : (
            <GlossaryView searchQuery={searchQuery} deepLinkTerm={deepLinkTerm} />
          )}
        </Suspense>
      </div>
    </TerminalShell>
  );
}

function LearnTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--signal-core)" : "var(--border-dim)"}`,
        background: active ? "rgba(5, 173, 152, 0.12)" : "transparent",
        color: active ? "var(--signal-core)" : "var(--text-secondary)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
