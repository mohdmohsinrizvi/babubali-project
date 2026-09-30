/**
 * Single source of truth for the project workspace.
 *
 * App.tsx builds the routes from this list, ProjectWorkspaceLayout builds the
 * sidebar from it, and OverviewPage builds the module cards from it. Adding a
 * new workspace section means editing this file only — the route, the nav entry
 * and the overview card stay in sync automatically.
 *
 * `placeholder: true` marks a Base-v1 route that deliberately renders an honest
 * "not implemented yet" state instead of product functionality.
 */
export interface WorkspaceModule {
  /** URL segment under /projects/:projectId/ */
  segment: string;
  /** Short label used in the sidebar navigation */
  navLabel: string;
  /** Full title used on the page and overview card */
  title: string;
  /** Honest description of what will live here once the module is built */
  description: string;
  /** false = implemented in Base-v1, true = placeholder only */
  placeholder: boolean;
}

export const OVERVIEW_SEGMENT = 'overview';

export const WORKSPACE_MODULES: WorkspaceModule[] = [
  {
    segment: 'overview',
    navLabel: 'Overview',
    title: 'Overview',
    description: 'Project details recorded in SmartBuild India.',
    placeholder: false,
  },
  {
    segment: 'plans',
    navLabel: 'Plans',
    title: 'Floor Plan Upload',
    description: 'Floor Plan Upload will be added by the Plan Analysis module.',
    placeholder: true,
  },
  {
    segment: 'analysis',
    navLabel: 'AI Analysis',
    title: 'AI Plan Analysis',
    description: 'AI-assisted plan analysis will be added by the Plan Analysis module.',
    placeholder: true,
  },
  {
    segment: 'estimation',
    navLabel: 'Estimation',
    title: 'Estimation',
    description: 'Quantity and cost estimation will be added by the Estimation module.',
    placeholder: true,
  },
  {
    segment: 'materials',
    navLabel: 'Materials',
    title: 'Materials',
    description: 'Material breakdown will be added by the Estimation module.',
    placeholder: true,
  },
  {
    segment: 'labour',
    navLabel: 'Labour & Timeline',
    title: 'Labour & Timeline',
    description: 'Labour and duration planning will be added by the Estimation module.',
    placeholder: true,
  },
  {
    segment: '3d',
    navLabel: '3D Model',
    title: 'Interactive 3D',
    description: 'Interactive 3D model will be added by the Visualization module.',
    placeholder: true,
  },
  {
    segment: 'reports',
    navLabel: 'Reports',
    title: 'Reports',
    description: 'Project reports will be added by the Reporting module.',
    placeholder: true,
  },
];
