import { useTranslation } from '../i18n/LanguageContext';
import type { LanguageCode } from '../i18n/types';
import './LanguageSelector.css';

export default function LanguageSelector() {
  const { language, setLanguage, languages } = useTranslation();

  return (
    <div className="language-selector" title="Select Language">
      <span className="language-selector__icon" aria-hidden="true">
        🌐
      </span>
      <select
        className="language-selector__select"
        value={language}
        onChange={(e) => setLanguage(e.target.value as LanguageCode)}
        aria-label="Choose Language"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
