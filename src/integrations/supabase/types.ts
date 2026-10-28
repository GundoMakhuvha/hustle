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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          created_at: string
          customer_id: string
          hustler_id: string
          id: string
          notes: string | null
          scheduled_date: string
          scheduled_time: string
          service_id: string
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at: string
          service_amount: number | null
          tip_amount: number
          platform_fee: number | null
          hustler_amount: number | null
          payment_status: "unpaid" | "pending" | "paid" | "refunded" | "failed"
          payment_reference: string | null
          paid_at: string | null
          decline_reason: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          hustler_id: string
          id?: string
          notes?: string | null
          scheduled_date: string
          scheduled_time: string
          service_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          updated_at?: string
          tip_amount?: number
          decline_reason?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          hustler_id?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          scheduled_time?: string
          service_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          updated_at?: string
          decline_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_hustler_id_fkey"
            columns: ["hustler_id"]
            isOneToOne: false
            referencedRelation: "hustler_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          customer_id: string
          hustler_id: string
          id: string
          last_message_at: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          hustler_id: string
          id?: string
          last_message_at?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          hustler_id?: string
          id?: string
          last_message_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_hustler_id_fkey"
            columns: ["hustler_id"]
            isOneToOne: false
            referencedRelation: "hustler_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings: {
        Row: {
          amount: number
          gross_amount: number | null
          platform_fee: number | null
          booking_id: string
          created_at: string
          hustler_id: string
          id: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          hustler_id: string
          id?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          hustler_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earnings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_hustler_id_fkey"
            columns: ["hustler_id"]
            isOneToOne: false
            referencedRelation: "hustler_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hustler_profiles: {
        Row: {
          average_rating: number | null
          bio: string | null
          created_at: string
          criminal_record_url: string
          id: string
          id_number: string
          is_available: boolean | null
          latitude: number | null
          longitude: number | null
          police_affidavit_url: string
          skills: string[] | null
          status: Database["public"]["Enums"]["hustler_status"]
          total_earnings: number | null
          total_reviews: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          criminal_record_url: string
          id?: string
          id_number: string
          is_available?: boolean | null
          latitude?: number | null
          longitude?: number | null
          police_affidavit_url: string
          skills?: string[] | null
          status?: Database["public"]["Enums"]["hustler_status"]
          total_earnings?: number | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          criminal_record_url?: string
          id?: string
          id_number?: string
          is_available?: boolean | null
          latitude?: number | null
          longitude?: number | null
          police_affidavit_url?: string
          skills?: string[] | null
          status?: Database["public"]["Enums"]["hustler_status"]
          total_earnings?: number | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hustler_profiles_profile_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hustler_payout_accounts: {
        Row: {
          hustler_id: string
          paystack_subaccount_code: string
          bank_code: string
          bank_name: string | null
          account_name: string | null
          account_last4: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          hustler_id: string
          paystack_subaccount_code: string
          bank_code: string
          bank_name?: string | null
          account_name?: string | null
          account_last4?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          hustler_id?: string
          paystack_subaccount_code?: string
          bank_code?: string
          bank_name?: string | null
          account_name?: string | null
          account_last4?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hustler_payout_accounts_hustler_id_fkey"
            columns: ["hustler_id"]
            isOneToOne: true
            referencedRelation: "hustler_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          email_notifications: boolean
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          email_notifications?: boolean
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          email_notifications?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          customer_id: string
          hustler_id: string
          id: string
          rating: number
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          hustler_id: string
          id?: string
          rating: number
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          hustler_id?: string
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_hustler_id_fkey"
            columns: ["hustler_id"]
            isOneToOne: false
            referencedRelation: "hustler_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          hustler_id: string
          id: string
          is_active: boolean | null
          photos: string[] | null
          price: number
          price_type: string | null
          title: string
          updated_at: string
          videos: string[] | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          hustler_id: string
          id?: string
          is_active?: boolean | null
          photos?: string[] | null
          price: number
          price_type?: string | null
          title: string
          updated_at?: string
          videos?: string[] | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          hustler_id?: string
          id?: string
          is_active?: boolean | null
          photos?: string[] | null
          price?: number
          price_type?: string | null
          title?: string
          updated_at?: string
          videos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_hustler_id_fkey"
            columns: ["hustler_id"]
            isOneToOne: false
            referencedRelation: "hustler_profiles"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_hustler_profile_id: { Args: { _user_id: string }; Returns: string }
      hustler_accepts_payments: { Args: { _hustler_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "hustler" | "admin"
      booking_status:
        | "pending"
        | "accepted"
        | "declined"
        | "completed"
        | "cancelled"
      hustler_status: "pending" | "approved" | "rejected"
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
      app_role: ["customer", "hustler", "admin"],
      booking_status: [
        "pending",
        "accepted",
        "declined",
        "completed",
        "cancelled",
      ],
      hustler_status: ["pending", "approved", "rejected"],
    },
  },
} as const
