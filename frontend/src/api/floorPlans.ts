import client from './client';
import type { FloorPlan } from '../types/floorPlan';

export async function listFloorPlans(projectId: number): Promise<FloorPlan[]> {
  const { data } = await client.get<FloorPlan[]>(`/projects/${projectId}/plans`);
  return data;
}

export async function uploadFloorPlan(
  projectId: number,
  file: File,
  floorNumber: number,
  floorName: string,
  planType: string = 'ARCHITECTURAL'
): Promise<FloorPlan> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('floorNumber', String(floorNumber));
  formData.append('floorName', floorName);
  formData.append('planType', planType);

  const { data } = await client.post<FloorPlan>(`/projects/${projectId}/plans`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}

export async function getFloorPlan(planId: number): Promise<FloorPlan> {
  const { data } = await client.get<FloorPlan>(`/plans/${planId}`);
  return data;
}

export function getFloorPlanFileUrl(planId: number): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api';
  return `${base}/plans/${planId}/file`;
}

export async function deleteFloorPlan(planId: number): Promise<void> {
  await client.delete(`/plans/${planId}`);
}
