import { NavLink, Outlet } from 'react-router-dom';
import './AppLayout.css';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="container app-header__inner">
          <NavLink to="/" className="app-brand" end>
            SmartBuild India
          </NavLink>
          <div className="app-header__right">
            <nav className="app-nav" aria-label="Main navigation">
              <NavLink
                to="/projects"
                className={({ isActive }) =>
                  isActive ? 'app-nav__link is-active' : 'app-nav__link'
                }
              >
                My Projects
              </NavLink>
            </nav>
            <NavLink to="/projects/new" className="btn btn--primary btn--normal">
              New Project
            </NavLink>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="app-footer">
        <div className="container app-footer__inner">
          <p>SmartBuild India — AI-assisted construction planning, from floor plan to final estimate.</p>
          <p className="muted">
            Base-v1 is the common foundation: project data, shared routes and layout. The feature
            modules are being built by the team.
          </p>
        </div>
      </footer>
    </div>
  );
}
