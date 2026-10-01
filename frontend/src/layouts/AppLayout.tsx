import { NavLink, Outlet } from 'react-router-dom';
import LanguageSelector from '../components/LanguageSelector';
import { useTranslation } from '../i18n/LanguageContext';
import './AppLayout.css';

export default function AppLayout() {
  const { t } = useTranslation();

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="container app-header__inner">
          <NavLink to="/" className="app-brand" end>
            {t('nav.brand', 'SmartBuild India')}
          </NavLink>
          <div className="app-header__right">
            <nav className="app-nav" aria-label="Main navigation">
              <NavLink
                to="/projects"
                className={({ isActive }) =>
                  isActive ? 'app-nav__link is-active' : 'app-nav__link'
                }
              >
                {t('nav.myProjects', 'My Projects')}
              </NavLink>
            </nav>
            <NavLink to="/projects/new" className="btn btn--primary btn--normal">
              {t('nav.newProject', 'New Project')}
            </NavLink>
            <LanguageSelector />
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
          <p>{t('nav.footerTagline', 'SmartBuild India — AI-assisted construction planning, from floor plan to final estimate.')}</p>
          <p className="muted">
            {t('nav.footerSub', 'Base-v1 is the common foundation: project data, shared routes and layout. The feature modules are being built by the team.')}
          </p>
        </div>
      </footer>
    </div>
  );
}
