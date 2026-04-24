import { useNavigate } from "react-router-dom";

interface Props {
  title: string;
  back?: boolean;
  action?: { label: string; onClick: () => void };
}

export function Header({ title, back, action }: Props) {
  const nav = useNavigate();
  return (
    <header className="app-header">
      <div className="row" style={{ gap: 8 }}>
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
        <h1>{title}</h1>
      </div>
      {action && (
        <button
          className="btn"
          style={{ padding: "6px 12px", minHeight: "auto" }}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </header>
  );
}
