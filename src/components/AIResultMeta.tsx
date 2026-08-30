type AIResultMetaProps = {
  provider: string;
  model: string;
  usedFallback: boolean;
  confidence?: number | null;
  tone?: string | null;
  summary?: string | null;
  safetyNotes?: string[];
};

export function AIResultMeta({
  provider,
  model,
  usedFallback,
  confidence,
  tone,
  summary,
  safetyNotes = [],
}: AIResultMetaProps) {
  return (
    <div className="ai-result-meta" aria-live="polite">
      <div className="ai-meta-header">
        <span className="eyebrow">LLM structured output</span>
        <div className="profile-tags">
          <span className="status-pill neutral-dark">{provider}</span>
          <span className="status-pill neutral-dark">{model}</span>
          <span className={usedFallback ? "status-pill warning" : "status-pill success"}>
            {usedFallback ? "Fallback mode" : "Model response"}
          </span>
          {confidence != null ? <span className="status-pill neutral-dark">{Math.round(confidence * 100)}% confidence</span> : null}
          {tone ? <span className="status-pill neutral-dark">Tone: {tone}</span> : null}
        </div>
      </div>
      {summary ? <p>{summary}</p> : null}
      {safetyNotes.length ? (
        <ul className="ai-note-list" aria-label="AI safety notes">
          {safetyNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
