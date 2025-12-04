export type UserRole = 'exporter' | 'qa_agency' | 'importer';

export type BatchStatus = 'pending' | 'in_progress' | 'approved' | 'rejected';

export type InspectionStatus = 'pending' | 'completed' | 'failed';

export interface Batch {
  id: string;
  batch_number: string;
  exporter_name: string;
  crop_type: string;
  destination_country: string;
  harvest_date: string;
  location: string;
  quantity_kg: number;
  status: BatchStatus;
  lab_reports: string[];
  farm_photos: string[];
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface Inspection {
  id: string;
  batch_id: string;
  inspector_name: string;
  moisture_level: number | null;
  pesticide_content: number | null;
  organic_status: boolean;
  quality_grade: string | null;
  notes: string | null;
  status: InspectionStatus;
  inspected_at: string | null;
  created_at: string;
}

export interface VerifiableCredential {
  id: string;
  batch_id: string;
  inspection_id: string;
  credential_data: Record<string, unknown>;
  qr_code_data: string;
  issued_by: string;
  issued_at: string;
  expires_at: string | null;
  verification_url: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_role: string;
  actor_name: string;
  details: Record<string, unknown>;
  created_at: string;
}
