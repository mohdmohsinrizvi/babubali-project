import type { ReactNode } from 'react';
import './components.css';

interface EmptyStateProps {
  title: string;
  message?: string;
  action?: ReactNode;
}

export default function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="state">
      <h2 className="state__title">{title}</h2>
      {message && <p className="state__message muted">{message}</p>}
      {action && <div className="state__action">{action}</div>}
    </div>
  );
}
