import client from './client';
import type { ProjectRequest, ProjectResponse } from '../types/project';

export async function listProjects(): Promise<ProjectResponse[]> {
  const { data } = await client.get<ProjectResponse[]>('/projects');
  return data;
}

export async function getProject(id: number): Promise<ProjectResponse> {
  const { data } = await client.get<ProjectResponse>(`/projects/${id}`);
  return data;
}

export async function createProject(data: ProjectRequest): Promise<ProjectResponse> {
  const response = await client.post<ProjectResponse>('/projects', data);
  return response.data;
}

export async function updateProject(id: number, data: ProjectRequest): Promise<ProjectResponse> {
  const { data: body } = await client.put<ProjectResponse>(`/projects/${id}`, data);
  return body;
}

export async function deleteProject(id: number): Promise<void> {
  await client.delete(`/projects/${id}`);
}
