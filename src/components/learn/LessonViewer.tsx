import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LearningLesson } from "../../lib/academy";
import { renderMarkdown } from "../../lib/renderMarkdown";

type Props = {
  lesson: LearningLesson;
  trackSlug: string;
  isCompleted: boolean;
  onComplete: () => void;
  onBack: () => void;
  onNextLesson?: () => void;
};

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

export function LessonViewer({ lesson, trackSlug: _trackSlug, isCompleted, onComplete, onBack, onNextLesson }: Props) {
  const navigate = useNavigate();
  const content = lesson.content;

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState(false);

  if (!content) {
    return (
      <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
        <button onClick={onBack} style={backBtnStyle}>BACK TO TRACK</button>
        <div style={{ ...mono, fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginTop: 16 }}>
          {lesson.title}
        </div>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", marginTop: 12 }}>
          Content for this lesson is not yet available. Check back soon.
        </p>
      </div>
    );
  }

  const handleCheckAnswer = () => {
    if (selectedAnswer === null) return;
    setQuizSubmitted(true);
    const correct = selectedAnswer === content.checkpoint.correctIndex;
    setQuizCorrect(correct);
    if (correct && !isCompleted) {
      onComplete();
    }
  };

  const handleTryAgain = () => {
    setSelectedAnswer(null);
    setQuizSubmitted(false);
    setQuizCorrect(false);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={onBack} style={backBtnStyle}>BACK TO TRACK</button>
        <div style={{ ...mono, fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginTop: 12, marginBottom: 10 }}>
          {lesson.title}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={pillStyle("var(--text-muted)", "rgba(148,163,184,0.12)")}>{lesson.durationMinutes} MIN</span>
          <span style={pillStyle(
            lesson.format === "simulation" ? "var(--info)" : lesson.format === "walkthrough" ? "var(--warning)" : "var(--positive)",
            lesson.format === "simulation" ? "rgba(96,165,250,0.12)" : lesson.format === "walkthrough" ? "rgba(234,179,8,0.12)" : "rgba(5,173,152,0.12)",
          )}>
            {lesson.format === "simulation" ? "PRACTICE" : lesson.format === "walkthrough" ? "APPLY" : "LEARN"}
          </span>
          <span style={pillStyle(
            lesson.riskLevel === "low" ? "var(--positive)" : lesson.riskLevel === "medium" ? "var(--warning)" : lesson.riskLevel === "high" ? "var(--negative)" : "var(--info)",
            lesson.riskLevel === "low" ? "rgba(5,173,152,0.12)" : lesson.riskLevel === "medium" ? "rgba(234,179,8,0.12)" : lesson.riskLevel === "high" ? "rgba(232,93,108,0.12)" : "rgba(96,165,250,0.12)",
          )}>
            {lesson.riskLevel.toUpperCase()} RISK
          </span>
        </div>
      </div>

      {/* Sections */}
      {content.sections.map((section, i) => (
        <div key={i} style={{ marginBottom: 28 }}>
          <div style={{
            ...mono,
            fontSize: 16,
            fontWeight: 700,
            color: "var(--signal-core)",
            marginBottom: 10,
            paddingBottom: 6,
            borderBottom: "1px solid var(--border-dim)",
          }}>
            {section.title}
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
            {renderMarkdown(section.body)}
          </div>
          {section.videoUrl && (
            <div style={{
              position: "relative",
              paddingBottom: "56.25%",
              height: 0,
              overflow: "hidden",
              borderRadius: 8,
              marginTop: 14,
              border: "1px solid var(--border-dim)",
            }}>
              <iframe
                src={section.videoUrl}
                title={section.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
              />
            </div>
          )}
          {section.tip && (
            <div style={{
              marginTop: 14,
              padding: "12px 16px",
              borderLeft: "4px solid var(--positive)",
              background: "rgba(5,173,152,0.06)",
              borderRadius: "0 6px 6px 0",
            }}>
              <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--positive)", marginBottom: 4 }}>TIP</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {section.tip}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Key Takeaways */}
      <div style={{
        padding: 16,
        background: "var(--bg-panel)",
        border: "1px solid var(--border-dim)",
        borderRadius: 8,
        marginBottom: 28,
      }}>
        <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--signal-core)", marginBottom: 10 }}>
          KEY TAKEAWAYS
        </div>
        <ul style={{ margin: 0, paddingLeft: 16, listStyle: "none" }}>
          {content.keyTakeaways.map((t, i) => (
            <li key={i} style={{
              marginBottom: 6,
              position: "relative",
              paddingLeft: 14,
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}>
              <span style={{ position: "absolute", left: 0, color: "var(--signal-core)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{"\u25B8"}</span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Checkpoint Quiz */}
      <div style={{
        padding: 20,
        background: "var(--bg-panel)",
        border: `1px solid ${isCompleted || quizCorrect ? "var(--positive)" : "var(--border-dim)"}`,
        borderRadius: 8,
        marginBottom: 28,
      }}>
        <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: isCompleted || quizCorrect ? "var(--positive)" : "var(--warning)", marginBottom: 10 }}>
          {isCompleted ? "CHECKPOINT (COMPLETED)" : "CHECKPOINT"}
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 15, color: "var(--text-primary)", fontWeight: 600, lineHeight: 1.5, marginBottom: 14 }}>
          {content.checkpoint.question}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {content.checkpoint.options.map((option, i) => {
            let bg = "var(--bg-panel-raised)";
            let borderColor = "var(--border-dim)";
            let textColor = "var(--text-secondary)";

            if (isCompleted) {
              // Reviewed state
              if (i === content.checkpoint.correctIndex) {
                bg = "rgba(5,173,152,0.12)";
                borderColor = "var(--positive)";
                textColor = "var(--positive)";
              }
            } else if (quizSubmitted) {
              if (i === selectedAnswer && quizCorrect) {
                bg = "rgba(5,173,152,0.12)";
                borderColor = "var(--positive)";
                textColor = "var(--positive)";
              } else if (i === selectedAnswer && !quizCorrect) {
                bg = "rgba(232,93,108,0.12)";
                borderColor = "var(--negative)";
                textColor = "var(--negative)";
              }
            } else if (i === selectedAnswer) {
              bg = "rgba(5,173,152,0.08)";
              borderColor = "var(--signal-core)";
              textColor = "var(--text-primary)";
            }

            return (
              <button
                key={i}
                onClick={() => {
                  if (!quizSubmitted && !isCompleted) setSelectedAnswer(i);
                }}
                disabled={quizSubmitted || isCompleted}
                style={{
                  padding: "10px 14px",
                  borderRadius: 6,
                  border: `1px solid ${borderColor}`,
                  background: bg,
                  color: textColor,
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  textAlign: "left",
                  cursor: quizSubmitted || isCompleted ? "default" : "pointer",
                  opacity: quizSubmitted || isCompleted ? (i === content.checkpoint.correctIndex || i === selectedAnswer ? 1 : 0.5) : 1,
                }}
              >
                {option}
              </button>
            );
          })}
        </div>

        {!isCompleted && !quizSubmitted && (
          <button
            onClick={handleCheckAnswer}
            disabled={selectedAnswer === null}
            style={{
              ...primaryBtnStyle,
              opacity: selectedAnswer === null ? 0.5 : 1,
              cursor: selectedAnswer === null ? "not-allowed" : "pointer",
            }}
          >
            CHECK ANSWER
          </button>
        )}

        {quizSubmitted && !quizCorrect && (
          <button onClick={handleTryAgain} style={primaryBtnStyle}>
            TRY AGAIN
          </button>
        )}

        {(quizSubmitted || isCompleted) && (
          <div style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 6,
            background: quizCorrect || isCompleted ? "rgba(5,173,152,0.08)" : "rgba(232,93,108,0.08)",
            border: `1px solid ${quizCorrect || isCompleted ? "var(--positive)" : "var(--negative)"}`,
          }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {quizCorrect || isCompleted
                ? content.checkpoint.explanation
                : "That's not quite right. Review the lesson and try again."}
            </div>
          </div>
        )}
      </div>

      {/* Practice Actions */}
      {lesson.practiceActions && lesson.practiceActions.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
            PRACTICE
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {lesson.practiceActions.map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.route)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 6,
                  border: "1px solid var(--border-dim)",
                  background: "var(--bg-panel-raised)",
                  cursor: "pointer",
                  textAlign: "left",
                  maxWidth: 260,
                }}
              >
                <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--signal-core)", marginBottom: 4 }}>
                  {action.label}
                </div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {action.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {onNextLesson && (
          <button onClick={onNextLesson} style={primaryBtnStyle}>
            NEXT LESSON
          </button>
        )}
        <button onClick={onBack} style={secondaryBtnStyle}>
          BACK TO TRACK
        </button>
      </div>
    </div>
  );
}

function pillStyle(color: string, bg: string): React.CSSProperties {
  return {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 999,
    background: bg,
    color,
  };
}

const backBtnStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 4,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
  color: "var(--text-secondary)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 4,
  border: "none",
  background: "var(--signal-core)",
  color: "var(--bg-base)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 4,
  border: "1px solid var(--border-dim)",
  background: "var(--bg-panel-raised)",
  color: "var(--text-secondary)",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};
