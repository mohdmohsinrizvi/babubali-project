import type { ReactNode } from 'react';
import './components.css';

interface LoadingStateProps {
  title?: string;
  message?: string;
  action?: ReactNode;
}

export default function LoadingState({ title = 'Loading…', message, action }: LoadingStateProps) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="state__spinner" aria-hidden="true" />
      <h2 className="state__title">{title}</h2>
      {message && <p className="state__message muted">{message}</p>}
      {action && <div className="state__action">{action}</div>}
    </div>
  );
}
