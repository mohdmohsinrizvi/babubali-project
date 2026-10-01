import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { getProject } from '../api/projects';
import { toApiError } from '../api/client';
import ErrorState from '../components/ErrorState';
import LanguageSelector from '../components/LanguageSelector';
import LoadingState from '../components/LoadingState';
import StatusBadge from '../components/StatusBadge';
import { useTranslation } from '../i18n/LanguageContext';
import type { ApiError, ProjectResponse } from '../types/project';
import { WORKSPACE_MODULES } from '../types/workspace';
import './ProjectWorkspaceLayout.css';

type LoadState =
  | { projectId: number; attempt: number; phase: 'loading' }
  | { projectId: number; attempt: number; phase: 'error'; error: ApiError }
  | { projectId: number; attempt: number; phase: 'ready'; project: ProjectResponse };

export default function ProjectWorkspaceLayout() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);
  const validId = Number.isInteger(projectId) && projectId > 0;

  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState>({ projectId, attempt, phase: 'loading' });

  useEffect(() => {
    if (!validId) return;

    let cancelled = false;
    getProject(projectId)
      .then((project) => {
        if (!cancelled) setState({ projectId, attempt, phase: 'ready', project });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ projectId, attempt, phase: 'error', error: toApiError(error) });
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, attempt, validId]);

  if (!validId) {
    return (
      <div className="workspace-state container">
        <ErrorState
          title="Project not found"
          message="This project link is not valid. It may have been removed."
          action={
            <Link className="btn btn--primary btn--normal" to="/projects">
              Back to My Projects
            </Link>
          }
        />
      </div>
    );
  }

  // State that belongs to a different id (or an earlier retry) is ignored, so
  // navigating between two projects never flashes the previous project's data.
  const view: LoadState =
    state.projectId === projectId && state.attempt === attempt
      ? state
      : { projectId, attempt, phase: 'loading' };

  const { t } = useTranslation();

  if (view.phase === 'loading') {
    return (
      <div className="workspace-state container">
        <LoadingState title={t('workspace.loadingProject', 'Loading project…')} />
      </div>
    );
  }

  if (view.phase === 'error') {
    return (
      <div className="workspace-state container">
        <ErrorState
          title={t('workspace.couldNotLoad', 'Could not load this project')}
          message={view.error.message}
          onRetry={() => setAttempt((value) => value + 1)}
          action={
            <Link className="btn btn--secondary btn--normal" to="/projects">
              {t('common.back', 'Back to My Projects')}
            </Link>
          }
        />
      </div>
    );
  }

  const { project } = view;

  const getModuleLabel = (segment: string, fallback: string) => {
    const key = segment === '3d' ? 'interactive3d' : segment;
    return t(`workspace.tabs.${key}`, fallback);
  };

  return (
    <div className="workspace">
      <header className="workspace-header">
        <div className="container workspace-header__inner">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link className="workspace-back" to="/projects">
              {t('workspace.backToProjects', '← Back to projects')}
            </Link>
            <LanguageSelector />
          </div>
          <div className="workspace-header__title">
            <h1>{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          <p className="workspace-header__location muted">
            {project.city}, {project.state}
          </p>
        </div>
      </header>

      <div className="container workspace-body">
        <nav className="workspace-nav" aria-label="Project sections">
          {WORKSPACE_MODULES.map((module) => (
            <NavLink
              key={module.segment}
              to={`/projects/${projectId}/${module.segment}`}
              className={({ isActive }) =>
                isActive ? 'workspace-nav__link is-active' : 'workspace-nav__link'
              }
            >
              <span>{getModuleLabel(module.segment, module.navLabel)}</span>
              {module.placeholder && (
                <span
                  className="workspace-nav__marker"
                  title="Coming soon — not implemented in Base-v1"
                >
                  {t('workspace.comingSoon', 'coming soon')}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="workspace-content">
          <Outlet context={{ project }} />
        </div>
      </div>
    </div>
  );
}
