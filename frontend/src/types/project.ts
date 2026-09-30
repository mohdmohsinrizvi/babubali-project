export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface ProjectRequest {
  name: string;
  state: string;
  district: string;
  city: string;
  constructionType: string;
  landAreaSqFt: number;
  builtUpAreaSqFt: number;
  floorCount: number;
  budget?: number | null;
  status?: ProjectStatus | null;
}

export interface ProjectResponse {
  id: number;
  name: string;
  state: string;
  district: string;
  city: string;
  constructionType: string;
  landAreaSqFt: number;
  builtUpAreaSqFt: number;
  floorCount: number;
  budget: number | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export const CONSTRUCTION_TYPES = [
  'Residential',
  'Commercial',
  'Industrial',
  'Institutional',
  'Mixed Use',
  'Other',
] as const;
