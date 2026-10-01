import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import ProjectWorkspaceLayout from './layouts/ProjectWorkspaceLayout';
import CreateProjectPage from './pages/CreateProjectPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import ProjectsPage from './pages/ProjectsPage';
import ModulePlaceholderPage from './pages/workspace/ModulePlaceholderPage';
import OverviewPage from './pages/workspace/OverviewPage';
import PlansPage from './pages/workspace/PlansPage';
import AiAnalysisPage from './pages/workspace/AiAnalysisPage';
import { LanguageProvider } from './i18n/LanguageContext';
import { OVERVIEW_SEGMENT, WORKSPACE_MODULES } from './types/workspace';

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<CreateProjectPage />} />
        </Route>

        <Route path="/projects/:projectId" element={<Navigate to={OVERVIEW_SEGMENT} replace />} />

        <Route path="/projects/:projectId" element={<ProjectWorkspaceLayout />}>
          {WORKSPACE_MODULES.map((module) => (
            <Route
              key={module.segment}
              path={module.segment}
              element={
                module.placeholder ? (
                  <ModulePlaceholderPage title={module.title} description={module.description} />
                ) : module.segment === 'plans' ? (
                  <PlansPage />
                ) : module.segment === 'analysis' ? (
                  <AiAnalysisPage />
                ) : (
                  <OverviewPage />
                )
              }
            />
          ))}
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  </LanguageProvider>
  );
}
