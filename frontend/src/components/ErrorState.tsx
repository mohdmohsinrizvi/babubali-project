import type { ReactNode } from 'react';
import Button from './Button';
import './components.css';

interface ErrorStateProps {
  title?: string;
  message?: string;
  action?: ReactNode;
  onRetry?: () => void;
}

export default function ErrorState({
  title = 'Something went wrong',
  message,
  action,
  onRetry,
}: ErrorStateProps) {
  const hasAction = Boolean(onRetry || action);

  return (
    <div className="state state--error" role="alert">
      <h2 className="state__title">{title}</h2>
      {message && <p className="state__message muted">{message}</p>}
      {hasAction && (
        <div className="state__action">
          {onRetry && (
            <Button variant="secondary" size="small" onClick={onRetry}>
              Retry
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
