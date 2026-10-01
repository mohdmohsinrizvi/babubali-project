import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext';
import './HomePage.css';

export default function HomePage() {
  const { t } = useTranslation();

  const capabilities = [
    {
      title: t('home.capabilities.plansTitle', 'Floor Plan Upload'),
      description: t('home.capabilities.plansDesc', 'Bring floor plan drawings into the project as the starting point for analysis.'),
    },
    {
      title: t('home.capabilities.analysisTitle', 'AI Plan Analysis'),
      description: t('home.capabilities.analysisDesc', 'AI-assisted review of layouts, spaces and overall plan quality.'),
    },
    {
      title: t('home.capabilities.quantityTitle', 'Quantity & Materials'),
      description: t('home.capabilities.quantityDesc', 'Quantities and a material breakdown derived from the plan.'),
    },
    {
      title: t('home.capabilities.costTitle', 'Cost Scenarios'),
      description: t('home.capabilities.costDesc', 'Estimate scenarios for budgeting and side-by-side comparison.'),
    },
    {
      title: t('home.capabilities.labourTitle', 'Labour & Timeline'),
      description: t('home.capabilities.labourDesc', 'Workforce planning and construction duration estimates.'),
    },
    {
      title: t('home.capabilities.interactive3dTitle', 'Interactive 3D'),
      description: t('home.capabilities.interactive3dDesc', 'Explore the building as an interactive 3D model.'),
    },
    {
      title: t('home.capabilities.reportsTitle', 'Reports'),
      description: t('home.capabilities.reportsDesc', 'Shareable project reports for owners and stakeholders.'),
    },
  ];

  return (
    <div className="home">
      <section className="hero">
        <p className="hero__eyebrow">{t('home.heroEyebrow', 'Construction planning platform')}</p>
        <h1 className="hero__title">{t('home.heroTitle', 'SmartBuild India')}</h1>
        <p className="hero__lead">
          {t('home.heroLead', 'AI-assisted construction planning, from floor plan to final estimate.')}
        </p>
        <p className="hero__sub muted">
          {t('home.heroSub', 'Base-v1 provides the shared project foundation — projects, overview and routes. The modules below are being built by the team.')}
        </p>
        <div className="hero__actions">
          <Link className="btn btn--primary btn--normal" to="/projects/new">
            {t('home.getStarted', 'Get Started')}
          </Link>
          <Link className="btn btn--secondary btn--normal" to="/projects">
            {t('home.viewMyProjects', 'View My Projects')}
          </Link>
        </div>
      </section>

      <section className="home-section" aria-labelledby="capabilities-heading">
        <div className="home-section__head">
          <h2 id="capabilities-heading">{t('home.modulesHeading', 'Modules in development')}</h2>
          <p className="muted">
            {t('home.modulesSub', 'Each capability below is planned for a future milestone. None of them are implemented yet — Base-v1 ships the project foundation only.')}
          </p>
        </div>
        <div className="capabilities">
          {capabilities.map((capability) => (
            <article className="capability" key={capability.title}>
              <div className="capability__head">
                <h3 className="capability__title">{capability.title}</h3>
                <span className="pill pill--planned">{t('home.planned', 'Planned')}</span>
              </div>
              <p className="capability__text muted">{capability.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
