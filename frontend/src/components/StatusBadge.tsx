import type { ProjectStatus } from '../types/project';
import './components.css';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

interface StatusBadgeProps {
  status: ProjectStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  // Fall back to the raw value so a status added by the backend later still
  // renders something readable instead of an empty badge.
  const label = STATUS_LABELS[status] ?? status;
  return <span className={`badge badge--${status.toLowerCase()}`}>{label}</span>;
}
