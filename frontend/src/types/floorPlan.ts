export type FloorPlanStatus = 'UPLOADED' | 'ANALYZED' | 'CONFIRMED';

export interface FloorPlan {
  id: number;
  projectId: number;
  floorNumber: number;
  floorName: string;
  planType: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: FloorPlanStatus;
  createdAt: string;
  updatedAt: string;
}

export type PlanAnalysisStatus = 'PENDING' | 'ANALYZED' | 'CONFIRMED';

export interface Room {
  id: string;
  name: string;
  roomType: string;
  lengthFt: number;
  widthFt: number;
  heightFt: number;
  areaSqFt: number;
}

export interface Opening {
  id: string;
  openingType: string;
  count: number;
  widthFt: number;
  heightFt: number;
}

export interface Stair {
  id: string;
  count: number;
  widthFt: number;
  flights: number;
}

export interface PlanAnalysis {
  id: number;
  floorPlanId: number;
  projectId: number;
  status: PlanAnalysisStatus;
  rooms: Room[];
  openings: Opening[];
  stairs: Stair[];
  totalCalculatedAreaSqFt: number;
  confidenceScore: number;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisUpdateRequest {
  rooms: Room[];
  openings: Opening[];
  stairs: Stair[];
}

export interface ConfirmedFloor {
  planId: number;
  floorNumber: number;
  floorName: string;
  planType: string;
  status: string;
  confirmedAt: string;
  rooms: Room[];
  openings: Opening[];
  stairs: Stair[];
}

export interface ProjectConfirmedPlans {
  projectId: number;
  totalFloors: number;
  totalBuiltUpAreaSqFt: number;
  floors: ConfirmedFloor[];
}
