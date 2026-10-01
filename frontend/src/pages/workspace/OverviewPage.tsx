import type { ReactNode } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';
import { useTranslation } from '../../i18n/LanguageContext';
import type { ProjectResponse } from '../../types/project';
import { OVERVIEW_SEGMENT, WORKSPACE_MODULES } from '../../types/workspace';
import './OverviewPage.css';

const MODULE_LINKS = WORKSPACE_MODULES.filter((module) => module.segment !== OVERVIEW_SEGMENT);

export default function OverviewPage() {
  const { project } = useOutletContext<{ project: ProjectResponse }>();
  const { t, language } = useTranslation();

  const locale = language === 'ur' ? 'ur-PK' : language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : language === 'te' ? 'te-IN' : 'en-IN';
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
  const areaFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const moneyFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  const getModuleTitle = (segment: string, fallback: string) => {
    const key = segment === '3d' ? 'interactive3d' : segment;
    return t(`workspace.tabs.${key}`, fallback);
  };

  const sqFtLabel = t('common.sqFt', 'sq ft');

  const details: Array<{ label: string; value: ReactNode }> = [
    { label: t('workspace.details.id', 'ID'), value: project.id },
    { label: t('workspace.details.name', 'Name'), value: project.name },
    { label: t('workspace.details.state', 'State'), value: project.state },
    { label: t('workspace.details.district', 'District'), value: project.district },
    { label: t('workspace.details.city', 'City'), value: project.city },
    { label: t('workspace.details.constructionType', 'Construction Type'), value: project.constructionType },
    { label: t('workspace.details.landArea', 'Land Area'), value: `${areaFormat.format(project.landAreaSqFt)} ${sqFtLabel}` },
    { label: t('workspace.details.builtUpArea', 'Built-up Area'), value: `${areaFormat.format(project.builtUpAreaSqFt)} ${sqFtLabel}` },
    { label: t('workspace.details.floors', 'Floors'), value: project.floorCount },
    {
      label: t('workspace.details.budget', 'Budget'),
      value:
        project.budget == null ? (
          <span className="muted">{t('common.notSet', 'Not set')}</span>
        ) : (
          moneyFormat.format(project.budget)
        ),
    },
    { label: t('workspace.details.status', 'Status'), value: <StatusBadge status={project.status} /> },
    { label: t('workspace.details.created', 'Created'), value: dateFormatter.format(new Date(project.createdAt)) },
    { label: t('workspace.details.updated', 'Updated'), value: dateFormatter.format(new Date(project.updatedAt)) },
  ];

  return (
    <div className="overview">
      <section aria-labelledby="overview-details-heading">
        <h2 id="overview-details-heading" className="overview__heading">
          {t('workspace.projectDetails', 'Project details')}
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
          {t('workspace.projectModules', 'Project modules')}
        </h2>
        <div className="module-grid">
          {MODULE_LINKS.map((module) => (
            <Link
              className="module-card"
              key={module.segment}
              to={`/projects/${project.id}/${module.segment}`}
            >
              <span className="module-card__title">{getModuleTitle(module.segment, module.title)}</span>
              <span className="pill pill--planned">{t('workspace.planned', 'Planned')}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
