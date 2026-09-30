import type { ReactNode } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';
import type { ProjectResponse } from '../../types/project';
import { OVERVIEW_SEGMENT, WORKSPACE_MODULES } from '../../types/workspace';
import './OverviewPage.css';

const dateFormatter = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const areaFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const moneyFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

const MODULE_LINKS = WORKSPACE_MODULES.filter((module) => module.segment !== OVERVIEW_SEGMENT);

export default function OverviewPage() {
  const { project } = useOutletContext<{ project: ProjectResponse }>();

  const details: Array<{ label: string; value: ReactNode }> = [
    { label: 'ID', value: project.id },
    { label: 'Name', value: project.name },
    { label: 'State', value: project.state },
    { label: 'District', value: project.district },
    { label: 'City', value: project.city },
    { label: 'Construction Type', value: project.constructionType },
    { label: 'Land Area', value: `${areaFormat.format(project.landAreaSqFt)} sq ft` },
    { label: 'Built-up Area', value: `${areaFormat.format(project.builtUpAreaSqFt)} sq ft` },
    { label: 'Floors', value: project.floorCount },
    {
      label: 'Budget',
      value:
        project.budget == null ? (
          <span className="muted">Not set</span>
        ) : (
          moneyFormat.format(project.budget)
        ),
    },
    { label: 'Status', value: <StatusBadge status={project.status} /> },
    { label: 'Created', value: dateFormatter.format(new Date(project.createdAt)) },
    { label: 'Updated', value: dateFormatter.format(new Date(project.updatedAt)) },
  ];

  return (
    <div className="overview">
      <section aria-labelledby="overview-details-heading">
        <h2 id="overview-details-heading" className="overview__heading">
          Project details
        </h2>
        <dl className="detail-list">
          {details.map((detail) => (
            <div className="detail" key={detail.label}>
              <dt className="detail__label">{detail.label}</dt>
              <dd className="detail__value">{detail.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="overview-modules-heading">
        <h2 id="overview-modules-heading" className="overview__heading">
          Project modules
        </h2>
        <div className="module-grid">
          {MODULE_LINKS.map((module) => (
            <Link
              className="module-card"
              key={module.segment}
              to={`/projects/${project.id}/${module.segment}`}
            >
              <span className="module-card__title">{module.title}</span>
              <span className="pill pill--planned">Planned</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
