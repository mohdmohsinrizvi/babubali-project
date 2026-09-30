import { Link, useLocation } from 'react-router-dom';
import './NotFoundPage.css';

export default function NotFoundPage() {
  const { pathname } = useLocation();
  const insideProject = pathname.startsWith('/projects/');

  return (
    <main className="not-found">
      <div className="not-found__inner">
        <p className="not-found__code">404</p>
        <h1>Page not found</h1>
        <p className="muted">The page you are looking for does not exist or has moved.</p>
        <div className="not-found__actions">
          {insideProject && (
            <Link className="btn btn--secondary btn--normal" to="/projects">
              Back to My Projects
            </Link>
          )}
          <Link className="btn btn--primary btn--normal" to="/">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
