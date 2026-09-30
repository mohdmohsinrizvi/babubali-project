import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import ProjectWorkspaceLayout from './layouts/ProjectWorkspaceLayout';
import CreateProjectPage from './pages/CreateProjectPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import ProjectsPage from './pages/ProjectsPage';
import ModulePlaceholderPage from './pages/workspace/ModulePlaceholderPage';
import OverviewPage from './pages/workspace/OverviewPage';
import { OVERVIEW_SEGMENT, WORKSPACE_MODULES } from './types/workspace';

export default function App() {
  return (
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
              /* placeholder=false alone renders OverviewPage. When you implement a
                 module, replace this branch with your own component in the SAME change
                 that flips the flag in types/workspace.ts. */
              element={
                module.placeholder ? (
                  <ModulePlaceholderPage title={module.title} description={module.description} />
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
  );
}
