import { Link } from 'react-router-dom';
import './HomePage.css';

const CAPABILITIES = [
  {
    title: 'Floor Plan Upload',
    description: 'Bring floor plan drawings into the project as the starting point for analysis.',
  },
  {
    title: 'AI Plan Analysis',
    description: 'AI-assisted review of layouts, spaces and overall plan quality.',
  },
  {
    title: 'Quantity & Materials',
    description: 'Quantities and a material breakdown derived from the plan.',
  },
  {
    title: 'Cost Scenarios',
    description: 'Estimate scenarios for budgeting and side-by-side comparison.',
  },
  {
    title: 'Labour & Timeline',
    description: 'Workforce planning and construction duration estimates.',
  },
  {
    title: 'Interactive 3D',
    description: 'Explore the building as an interactive 3D model.',
  },
  {
    title: 'Reports',
    description: 'Shareable project reports for owners and stakeholders.',
  },
];

export default function HomePage() {
  return (
    <div className="home">
      <section className="hero">
        <p className="hero__eyebrow">Construction planning platform</p>
        <h1 className="hero__title">SmartBuild India</h1>
        <p className="hero__lead">
          AI-assisted construction planning, from floor plan to final estimate.
        </p>
        <p className="hero__sub muted">
          Base-v1 provides the shared project foundation — projects, overview and routes. The
          modules below are being built by the team.
        </p>
        <div className="hero__actions">
          <Link className="btn btn--primary btn--normal" to="/projects/new">
            Get Started
          </Link>
          <Link className="btn btn--secondary btn--normal" to="/projects">
            View My Projects
          </Link>
        </div>
      </section>

      <section className="home-section" aria-labelledby="capabilities-heading">
        <div className="home-section__head">
          <h2 id="capabilities-heading">Modules in development</h2>
          <p className="muted">
            Each capability below is planned for a future milestone. None of them are implemented
            yet — Base-v1 ships the project foundation only.
          </p>
        </div>
        <div className="capabilities">
          {CAPABILITIES.map((capability) => (
            <article className="capability" key={capability.title}>
              <div className="capability__head">
                <h3 className="capability__title">{capability.title}</h3>
                <span className="pill pill--planned">Planned</span>
              </div>
              <p className="capability__text muted">{capability.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
