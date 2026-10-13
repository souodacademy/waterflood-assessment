export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          id: string
          user_id: string | null
          well_name: string
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          id?: string
          user_id?: string | null
          well_name: string
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          id?: string
          user_id?: string | null
          well_name?: string
        }
        Relationships: []
      }
      measurements: {
        Row: {
          id: string
          injection_rate: number | null
          measurement_date: string
          oil_rate: number | null
          pressure: number | null
          status: string
          water_cut: number | null
          water_rate: number | null
          well_id: string
        }
        Insert: {
          id?: string
          injection_rate?: number | null
          measurement_date: string
          oil_rate?: number | null
          pressure?: number | null
          status: string
          water_cut?: number | null
          water_rate?: number | null
          well_id: string
        }
        Update: {
          id?: string
          injection_rate?: number | null
          measurement_date?: string
          oil_rate?: number | null
          pressure?: number | null
          status?: string
          water_cut?: number | null
          water_rate?: number | null
          well_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurements_well_id_fkey"
            columns: ["well_id"]
            isOneToOne: false
            referencedRelation: "wells"
            referencedColumns: ["id"]
          },
        ]
      }
      relationships: {
        Row: {
          distance: number
          id: string
          injector_id: string
          producer_id: string
          status: string
        }
        Insert: {
          distance: number
          id?: string
          injector_id: string
          producer_id: string
          status?: string
        }
        Update: {
          distance?: number
          id?: string
          injector_id?: string
          producer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_injector_id_fkey"
            columns: ["injector_id"]
            isOneToOne: false
            referencedRelation: "wells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "wells"
            referencedColumns: ["id"]
          },
        ]
      }
      thresholds: {
        Row: {
          decline_pct: number
          high_pressure: number
          id: number
          low_injection: number
          low_oil: number
          water_cut: number
        }
        Insert: {
          decline_pct?: number
          high_pressure?: number
          id?: number
          low_injection?: number
          low_oil?: number
          water_cut?: number
        }
        Update: {
          decline_pct?: number
          high_pressure?: number
          id?: number
          low_injection?: number
          low_oil?: number
          water_cut?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wells: {
        Row: {
          field_name: string
          id: string
          injection_rate: number | null
          is_sample: boolean
          latitude: number
          longitude: number
          measurement_date: string
          name: string
          oil_rate: number | null
          pressure: number | null
          status: string
          updated_at: string
          water_cut: number | null
          water_rate: number | null
          well_type: string
        }
        Insert: {
          field_name: string
          id?: string
          injection_rate?: number | null
          is_sample?: boolean
          latitude: number
          longitude: number
          measurement_date?: string
          name: string
          oil_rate?: number | null
          pressure?: number | null
          status?: string
          updated_at?: string
          water_cut?: number | null
          water_rate?: number | null
          well_type: string
        }
        Update: {
          field_name?: string
          id?: string
          injection_rate?: number | null
          is_sample?: boolean
          latitude?: number
          longitude?: number
          measurement_date?: string
          name?: string
          oil_rate?: number | null
          pressure?: number | null
          status?: string
          updated_at?: string
          water_cut?: number | null
          water_rate?: number | null
          well_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "operator" | "engineer" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["operator", "engineer", "admin"],
    },
  },
} as const
