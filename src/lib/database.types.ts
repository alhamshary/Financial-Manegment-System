
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          details: string | null
          id: number
          timestamp: string | null
          user_id: string
        }
        Insert: {
          action: string
          details?: string | null
          id?: never
          timestamp?: string | null
          user_id: string
        }
        Update: {
          action?: string
          details?: string | null
          id?: never
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          app_theme: string
          id: boolean
          office_title: string
        }
        Insert: {
          app_theme?: string
          id?: boolean
          office_title?: string
        }
        Update: {
          app_theme?: string
          id?: boolean
          office_title?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          check_in: string
          check_out: string | null
          id: number
          session_duration: number | null
          user_id: string
          work_date: string
        }
        Insert: {
          check_in: string
          check_out?: string | null
          id?: never
          session_duration?: number | null
          user_id: string
          work_date: string
        }
        Update: {
          check_in?: string
          check_out?: string | null
          id?: never
          session_duration?: number | null
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string | null
          id: number
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          id?: never
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          id?: never
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: number
          name: string
          amount: number
          user_id: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          amount: number
          user_id: string
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          amount?: number
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_id: number
          created_at: string | null
          discount: number | null
          id: number
          notes: string | null
          price: number
          quantity: number | null
          service_id: number
          total: number | null
          user_id: string
        }
        Insert: {
          client_id: number
          created_at?: string | null
          discount?: number | null
          id?: never
          notes?: string | null
          price: number
          quantity?: number | null
          service_id: number
          total?: number | null
          user_id: string
        }
        Update: {
          client_id?: number
          created_at?: string | null
          discount?: number | null
          id?: never
          notes?: string | null
          price?: number
          quantity?: number | null
          service_id?: number
          total?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string | null
          created_at: string | null
          id: number
          name: string
          price: number
          link: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: never
          name: string
          price: number
          link?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: never
          name?: string
          price?: number
          link?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          device_info: string | null
          id: number
          ip_address: string | null
          login_time: string
          logout_time: string | null
          user_id: string
        }
        Insert: {
          device_info?: string | null
          id?: never
          ip_address?: string | null
          login_time: string
          logout_time?: string | null
          user_id: string
        }
        Update: {
          device_info?: string | null
          id?: never
          ip_address?: string | null
          login_time?: string
          logout_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          role: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_start_attendance: {
        Args: { user_id_param: string }
        Returns: {
          attendance_id: number
          is_new_session: boolean
        }[]
      }
      end_current_attendance: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      get_today_work_hours: {
        Args: { user_id_param: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
