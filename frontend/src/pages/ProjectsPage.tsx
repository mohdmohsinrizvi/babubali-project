import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProjects } from '../api/projects';
import { toApiError } from '../api/client';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { useTranslation } from '../i18n/LanguageContext';
import type { ApiError, ProjectResponse } from '../types/project';
import './ProjectsPage.css';

export default function ProjectsPage() {
  const { t, language } = useTranslation();
  const locale = language === 'ur' ? 'ur-PK' : language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : language === 'te' ? 'te-IN' : 'en-IN';
  const areaFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const [projects, setProjects] = useState<ProjectResponse[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  function reload() {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }

  useEffect(() => {
    let active = true;
    listProjects()
      .then((data) => {
        if (!active) return;
        setProjects(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(toApiError(err));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return (
    <div className="projects-page">
      <PageHeader
        title={t('nav.myProjects', 'My Projects')}
        subtitle={t('nav.footerTagline', 'All construction projects recorded in SmartBuild India.')}
        actions={
          <Link className="btn btn--primary btn--normal" to="/projects/new">
            {t('nav.newProject', 'New Project')}
          </Link>
        }
      />

      {loading && <LoadingState title={t('common.loading', 'Loading projects…')} />}

      {!loading && error && (
        <ErrorState
          title={t('workspace.couldNotLoad', 'Could not load projects')}
          message={error.message}
          onRetry={reload}
        />
      )}

      {!loading && !error && projects && projects.length === 0 && (
        <EmptyState
          title={t('common.empty', 'No projects yet')}
          message={t('workspace.tabDescriptions.overview', 'Create your first project to get started.')}
          action={
            <Link className="btn btn--primary btn--normal" to="/projects/new">
              {t('nav.newProject', 'New Project')}
            </Link>
          }
        />
      )}

      {!loading && !error && projects && projects.length > 0 && (
        <div className="projects-grid">
          {projects.map((project) => (
            <article className="project-card" key={project.id}>
              <div className="project-card__head">
                <h2 className="project-card__name">{project.name}</h2>
                <StatusBadge status={project.status} />
              </div>
              <p className="project-card__location muted">
                {project.city}, {project.state}
              </p>
              <dl className="project-card__facts">
                <div>
                  <dt>{t('workspace.details.constructionType', 'Construction type')}</dt>
                  <dd>{project.constructionType}</dd>
                </div>
                <div>
                  <dt>{t('workspace.details.builtUpArea', 'Built-up area')}</dt>
                  <dd>{areaFormat.format(project.builtUpAreaSqFt)} {t('common.sqFt', 'sq ft')}</dd>
                </div>
                <div>
                  <dt>{t('workspace.details.floors', 'Floors')}</dt>
                  <dd>
                    {project.floorCount} {t('workspace.details.floors', 'floors')}
                  </dd>
                </div>
              </dl>
              <Link
                className="btn btn--secondary btn--normal project-card__action"
                to={`/projects/${project.id}/overview`}
              >
                {t('workspace.tabs.overview', 'Open Project')}
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
