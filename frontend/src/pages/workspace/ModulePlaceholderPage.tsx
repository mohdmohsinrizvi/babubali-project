import './ModulePlaceholderPage.css';

interface ModulePlaceholderPageProps {
  title: string;
  description: string;
}

export default function ModulePlaceholderPage({ title, description }: ModulePlaceholderPageProps) {
  return (
    <div className="module-placeholder">
      <span className="pill pill--planned">Not implemented in Base-v1</span>
      <h2 className="module-placeholder__title">{title}</h2>
      <p className="module-placeholder__text muted">{description}</p>
    </div>
  );
}
