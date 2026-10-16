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
