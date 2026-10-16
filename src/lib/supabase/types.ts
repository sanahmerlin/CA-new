export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
}

export interface Database {
  public: {
    Tables: {
      hospitals: {
        Row: {
          id: string;
          name: string;
          contact_phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact_phone?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          hospital_id: string;
          full_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          hospital_id: string;
          full_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          hospital_id?: string;
          full_name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          }
        ];
      };
      departments: {
        Row: {
          id: string;
          hospital_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          hospital_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          hospital_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "departments_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          }
        ];
      };
      patients: {
        Row: {
          id: string;
          hospital_id: string;
          department_id: string | null;
          full_name: string;
          age: number;
          sex: string;
          patient_phone: string;
          caregiver_name: string | null;
          caregiver_relation: string | null;
          caregiver_phone: string | null;
          discharge_date: string;
          raw_history_text: string | null;
          status: string;
          access_code: string | null;
          plan_tier: string;
          consent_given: boolean;
          monitoring_tier: string;
          username: string | null;
          password_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          hospital_id: string;
          department_id?: string | null;
          full_name: string;
          age: number;
          sex: string;
          patient_phone: string;
          caregiver_name?: string | null;
          caregiver_relation?: string | null;
          caregiver_phone?: string | null;
          discharge_date?: string;
          raw_history_text?: string | null;
          status?: string;
          access_code?: string | null;
          plan_tier?: string;
          consent_given?: boolean;
          monitoring_tier?: string;
          username?: string | null;
          password_hash?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          hospital_id?: string;
          department_id?: string | null;
          full_name?: string;
          age?: number;
          sex?: string;
          patient_phone?: string;
          caregiver_name?: string | null;
          caregiver_relation?: string | null;
          caregiver_phone?: string | null;
          discharge_date?: string;
          raw_history_text?: string | null;
          status?: string;
          access_code?: string | null;
          plan_tier?: string;
          consent_given?: boolean;
          monitoring_tier?: string;
          username?: string | null;
          password_hash?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patients_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patients_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          }
        ];
      };
      patient_records: {
        Row: {
          id: string;
          patient_id: string;
          hospital_id: string;
          diagnosis: string;
          medications: Json;
          medical_history: Json;
          risk_factors: Json;
          allergies: Json;
          follow_up_plan: string | null;
          confirmed_by: string | null;
          confirmed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          hospital_id: string;
          diagnosis: string;
          medications?: Json;
          medical_history?: Json;
          risk_factors?: Json;
          allergies?: Json;
          follow_up_plan?: string | null;
          confirmed_by?: string | null;
          confirmed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          hospital_id?: string;
          diagnosis?: string;
          medications?: Json;
          medical_history?: Json;
          risk_factors?: Json;
          allergies?: Json;
          follow_up_plan?: string | null;
          confirmed_by?: string | null;
          confirmed_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patient_records_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patient_records_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          }
        ];
      };
      monitoring_plans: {
        Row: {
          id: string;
          patient_id: string;
          hospital_id: string;
          risk_tier: string;
          window_days: number;
          schedule: Json;
          focus_areas: Json;
          red_flag_symptoms: Json;
          model_name: string | null;
          prompt_version: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          hospital_id: string;
          risk_tier: string;
          window_days?: number;
          schedule: Json;
          focus_areas: Json;
          red_flag_symptoms: Json;
          model_name?: string | null;
          prompt_version?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          hospital_id?: string;
          risk_tier?: string;
          window_days?: number;
          schedule?: Json;
          focus_areas?: Json;
          red_flag_symptoms?: Json;
          model_name?: string | null;
          prompt_version?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "monitoring_plans_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monitoring_plans_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          }
        ];
      };
      checkins: {
        Row: {
          id: string;
          patient_id: string;
          hospital_id: string;
          scheduled_day: number;
          scheduled_for: string;
          status: string;
          questions: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          hospital_id: string;
          scheduled_day?: number;
          scheduled_for: string;
          status?: string;
          questions: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          hospital_id?: string;
          scheduled_day?: number;
          scheduled_for?: string;
          status?: string;
          questions?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checkins_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkins_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          }
        ];
      };
      responses: {
        Row: {
          id: string;
          checkin_id: string;
          patient_id: string;
          hospital_id: string;
          answers: Json;
          severity: string;
          clinical_summary: string | null;
          red_flags_detected: Json | null;
          answered_at: string;
        };
        Insert: {
          id?: string;
          checkin_id: string;
          patient_id: string;
          hospital_id: string;
          answers: Json;
          severity: string;
          clinical_summary?: string | null;
          red_flags_detected?: Json | null;
          answered_at?: string;
        };
        Update: {
          id?: string;
          checkin_id?: string;
          patient_id?: string;
          hospital_id?: string;
          answers?: Json;
          severity?: string;
          clinical_summary?: string | null;
          red_flags_detected?: Json | null;
          answered_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "responses_checkin_id_fkey";
            columns: ["checkin_id"];
            isOneToOne: false;
            referencedRelation: "checkins";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "responses_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "responses_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          }
        ];
      };
      alerts: {
        Row: {
          id: string;
          patient_id: string;
          hospital_id: string;
          checkin_id: string | null;
          severity: string;
          reasons: Json;
          source: string;
          status: string;
          resolved_note: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          hospital_id: string;
          checkin_id?: string | null;
          severity: string;
          reasons: Json;
          source: string;
          status?: string;
          resolved_note?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          hospital_id?: string;
          checkin_id?: string | null;
          severity?: string;
          reasons?: Json;
          source?: string;
          status?: string;
          resolved_note?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_checkin_id_fkey";
            columns: ["checkin_id"];
            isOneToOne: false;
            referencedRelation: "checkins";
            referencedColumns: ["id"];
          }
        ];
      };
      app_settings: {
        Row: {
          hospital_id: string;
          simulated_time_offset_minutes: number;
          updated_at: string;
        };
        Insert: {
          hospital_id: string;
          simulated_time_offset_minutes?: number;
          updated_at?: string;
        };
        Update: {
          hospital_id?: string;
          simulated_time_offset_minutes?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "app_settings_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: true;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_log: {
        Row: {
          id: string;
          hospital_id: string;
          user_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          hospital_id: string;
          user_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          hospital_id?: string;
          user_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_hospital_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
