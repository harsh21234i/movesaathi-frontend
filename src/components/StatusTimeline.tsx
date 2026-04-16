type StatusTimelineProps = {
  items: Array<{
    label: string;
    tone: "done" | "current" | "upcoming";
    timestamp?: string;
  }>;
};

function formatTime(value?: string) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function StatusTimeline({ items }: StatusTimelineProps) {
  return (
    <div className="status-timeline" aria-label="Status timeline">
      {items.map((item) => (
        <div key={`${item.label}-${item.timestamp ?? "pending"}`} className={`status-step ${item.tone}`}>
          <span className="status-step-dot" />
          <div>
            <strong>{item.label}</strong>
            {item.timestamp ? <p>{formatTime(item.timestamp)}</p> : <p>Waiting for the next step.</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
