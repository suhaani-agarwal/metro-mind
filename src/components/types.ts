export interface ReadinessScore {
  train_id: string;
  score: number;
  breakdown: Record<string, number>;
  details: Record<string, unknown>;
}

export interface CleaningAssignment {
  train_id: string;
  start_time: string;
  end_time: string;
  crew_assigned: number;
  priority: number;
  reason: string;
}

export interface ParkingAssignment {
  train_id: string;
  track_id: string;
  position_in_track: number;
  moves_required: number;
  shunting_path: string[];
}

export interface DepotLayout {
  parking_tracks: Array<{
    id: string;
    capacity?: number;
    current_trains?: string[];
  }>;
  ibl_bays: string[];
  connections: Record<string, string[]>;
  exit_points: string[];
}

export interface OptimizationResponse {
  readiness_scores: ReadinessScore[];
  cleaning_assignments: CleaningAssignment[];
  parking_assignments: ParkingAssignment[];
  trains_to_ibl: string[];
  trains_to_service: string[];
  trains_to_standby: string[];
  explanation: Record<string, unknown>;
  metadata: Record<string, unknown>;
  total_shunting_moves: number;
}
