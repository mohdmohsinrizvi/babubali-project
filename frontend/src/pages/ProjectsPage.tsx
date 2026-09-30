import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProjects } from '../api/projects';
import { toApiError } from '../api/client';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import type { ApiError, ProjectResponse } from '../types/project';
import './ProjectsPage.css';

const areaFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export default function ProjectsPage() {
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
        title="My Projects"
        subtitle="All construction projects you have created."
        actions={
          <Link className="btn btn--primary btn--normal" to="/projects/new">
            New Project
          </Link>
        }
      />

      {loading && <LoadingState title="Loading projects…" />}

      {!loading && error && (
        <ErrorState
          title="Could not load projects"
          message={error.message}
          onRetry={reload}
        />
      )}

      {!loading && !error && projects && projects.length === 0 && (
        <EmptyState
          title="No projects yet"
          message="Create your first project to get started."
          action={
            <Link className="btn btn--primary btn--normal" to="/projects/new">
              Create project
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
                  <dt>Construction type</dt>
                  <dd>{project.constructionType}</dd>
                </div>
                <div>
                  <dt>Built-up area</dt>
                  <dd>{areaFormat.format(project.builtUpAreaSqFt)} sq ft</dd>
                </div>
                <div>
                  <dt>Floors</dt>
                  <dd>
                    {project.floorCount} {project.floorCount === 1 ? 'floor' : 'floors'}
                  </dd>
                </div>
              </dl>
              <Link
                className="btn btn--secondary btn--normal project-card__action"
                to={`/projects/${project.id}/overview`}
              >
                Open Project
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
