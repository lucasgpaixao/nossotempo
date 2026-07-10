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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_photos: {
        Row: {
          created_at: string
          id: string
          order_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_email: string | null
          created_at: string
          edit_expires_at: string | null
          edit_token: string | null
          id: string
          letter_pdf_path: string | null
          message: string | null
          mp_payment_core_id: string | null
          mp_payment_downsell_id: string | null
          mp_payment_upsell_id: string | null
          mp_preference_core_id: string | null
          mp_preference_downsell_id: string | null
          mp_preference_upsell_id: string | null
          name1: string | null
          name2: string | null
          polaroid_pdf_path: string | null
          public_id: string
          qr_storage_path: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          terms_accepted_at: string | null
          updated_at: string
          youtube_thumbnail: string | null
          youtube_title: string | null
          youtube_video_id: string | null
        }
        Insert: {
          buyer_email?: string | null
          created_at?: string
          edit_expires_at?: string | null
          edit_token?: string | null
          id?: string
          letter_pdf_path?: string | null
          message?: string | null
          mp_payment_core_id?: string | null
          mp_payment_downsell_id?: string | null
          mp_payment_upsell_id?: string | null
          mp_preference_core_id?: string | null
          mp_preference_downsell_id?: string | null
          mp_preference_upsell_id?: string | null
          name1?: string | null
          name2?: string | null
          polaroid_pdf_path?: string | null
          public_id: string
          qr_storage_path?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          terms_accepted_at?: string | null
          updated_at?: string
          youtube_thumbnail?: string | null
          youtube_title?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          buyer_email?: string | null
          created_at?: string
          edit_expires_at?: string | null
          edit_token?: string | null
          id?: string
          letter_pdf_path?: string | null
          message?: string | null
          mp_payment_core_id?: string | null
          mp_payment_downsell_id?: string | null
          mp_payment_upsell_id?: string | null
          mp_preference_core_id?: string | null
          mp_preference_downsell_id?: string | null
          mp_preference_upsell_id?: string | null
          name1?: string | null
          name2?: string | null
          polaroid_pdf_path?: string | null
          public_id?: string
          qr_storage_path?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          terms_accepted_at?: string | null
          updated_at?: string
          youtube_thumbnail?: string | null
          youtube_title?: string | null
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          banner_enabled: boolean
          banner_target_at: string | null
          banner_text: string | null
          id: number
          price_core_cents: number
          price_downsell_cents: number
          price_upsell_cents: number
          support_email: string | null
          support_whatsapp: string | null
          updated_at: string
        }
        Insert: {
          banner_enabled?: boolean
          banner_target_at?: string | null
          banner_text?: string | null
          id?: number
          price_core_cents?: number
          price_downsell_cents?: number
          price_upsell_cents?: number
          support_email?: string | null
          support_whatsapp?: string | null
          updated_at?: string
        }
        Update: {
          banner_enabled?: boolean
          banner_target_at?: string | null
          banner_text?: string | null
          id?: number
          price_core_cents?: number
          price_downsell_cents?: number
          price_upsell_cents?: number
          support_email?: string | null
          support_whatsapp?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      order_status:
        | "draft"
        | "pending_payment"
        | "core_paid"
        | "upsell_offered"
        | "upsell_paid"
        | "downsell_offered"
        | "downsell_paid"
        | "completed"
        | "cancelled"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      order_status: [
        "draft",
        "pending_payment",
        "core_paid",
        "upsell_offered",
        "upsell_paid",
        "downsell_offered",
        "downsell_paid",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
