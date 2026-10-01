import client from './client';
import type { AnalysisUpdateRequest, PlanAnalysis, ProjectConfirmedPlans } from '../types/floorPlan';

export async function analyzePlan(planId: number, apiKey?: string): Promise<PlanAnalysis> {
  const headers: Record<string, string> = {};
  if (apiKey && apiKey.trim()) {
    headers['X-Gemini-Api-Key'] = apiKey.trim();
  }
  const { data } = await client.post<PlanAnalysis>(`/plans/${planId}/analyze`, null, {
    headers,
    timeout: 90000,
  });
  return data;
}

export async function getPlanAnalysis(planId: number): Promise<PlanAnalysis> {
  const { data } = await client.get<PlanAnalysis>(`/plans/${planId}/analysis`);
  return data;
}

export async function updatePlanAnalysis(
  planId: number,
  payload: AnalysisUpdateRequest
): Promise<PlanAnalysis> {
  const { data } = await client.put<PlanAnalysis>(`/plans/${planId}/analysis`, payload);
  return data;
}

export async function confirmPlanAnalysis(planId: number): Promise<PlanAnalysis> {
  const { data } = await client.post<PlanAnalysis>(`/plans/${planId}/confirm`);
  return data;
}

export async function getConfirmedAnalysis(planId: number): Promise<PlanAnalysis> {
  const { data } = await client.get<PlanAnalysis>(`/plans/${planId}/confirmed-analysis`);
  return data;
}

export async function getProjectConfirmedPlans(projectId: number): Promise<ProjectConfirmedPlans> {
  const { data } = await client.get<ProjectConfirmedPlans>(`/projects/${projectId}/confirmed-plans`);
  return data;
}
