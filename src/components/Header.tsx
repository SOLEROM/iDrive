import { useNavigate } from "react-router-dom";

interface Props {
  title: string;
  back?: boolean;
  action?: { label: string; onClick: () => void };
  /** Custom node rendered on the right edge when no `action` button is set. */
  right?: React.ReactNode;
}

export function Header({ title, back, action, right }: Props) {
  const nav = useNavigate();
  return (
    <header className="app-header">
      <div className="row" style={{ gap: 8, minWidth: 0 }}>
        {back && (
          <button
            className="btn btn--ghost"
            style={{ padding: "4px 10px", minHeight: "auto", border: 0 }}
            onClick={() => nav(-1)}
            aria-label="Back"
          >
            ← Back
          </button>
        )}
        <h1 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h1>
      </div>
      {action ? (
        <button
          className="btn"
          style={{ padding: "6px 12px", minHeight: "auto" }}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ) : right ?? null}
    </header>
  );
}
