export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
