# SmartBuild India — Frontend

React + TypeScript client for SmartBuild India.

Base-v1 covers the shared project foundation only: landing page, project list, project
create form, project overview and the workspace shell. The feature module routes
(plans, AI analysis, estimation, materials, labour, 3D, reports) are honest placeholders.

Stack: Vite + React 19 + TypeScript, `react-router-dom` (BrowserRouter + Routes), `axios`.

## Commands

```bash
npm install       # install dependencies
npm run dev       # dev server on http://localhost:5173, proxies /api to http://localhost:8080
npm run build     # type-check (tsc -b) + production build (vite build)
npm run lint      # oxlint
npm run preview   # preview the production build
```

## Environment

`.env.example` documents the only variable:

- `VITE_API_BASE_URL` — API base URL. Defaults to `/api` (relative, handled by the Vite
  proxy). Set an absolute value such as `http://localhost:8080/api` if the API is hosted
  elsewhere. Copy to `.env.local` to override locally.

## Layout

```
src/
├── main.tsx        # entry: tokens + global styles, mounts <App />
├── App.tsx         # router only
├── api/            # axios client + typed project API calls
├── types/          # TS types matching the backend contract
├── layouts/        # AppLayout (public pages), ProjectWorkspaceLayout (project shell)
├── pages/          # Home, Projects, Create Project, Not Found, workspace pages
├── components/     # Button, FormField, PageHeader, state components, StatusBadge
└── styles/         # design tokens + global styles
```
