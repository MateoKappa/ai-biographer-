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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cartoon_panels: {
        Row: {
          created_at: string
          id: string
          image_url: string
          order_index: number
          scene_text: string
          story_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          order_index: number
          scene_text: string
          story_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          order_index?: number
          scene_text?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cartoon_panels_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_captures: {
        Row: {
          answer_text: string
          created_at: string
          id: string
          occurred_date: string | null
          question_id: string
          sentiment: string | null
          tags: string[] | null
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_text: string
          created_at?: string
          id?: string
          occurred_date?: string | null
          question_id: string
          sentiment?: string | null
          tags?: string[] | null
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_text?: string
          created_at?: string
          id?: string
          occurred_date?: string | null
          question_id?: string
          sentiment?: string | null
          tags?: string[] | null
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_captures_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "template_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_captures_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "memory_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_templates: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          context_qa: Json | null
          created_at: string
          desired_panels: number | null
          id: string
          memory_ids: string[] | null
          photo_url: string | null
          status: string
          story_text: string
          temperature: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_qa?: Json | null
          created_at?: string
          desired_panels?: number | null
          id?: string
          memory_ids?: string[] | null
          photo_url?: string | null
          status?: string
          story_text: string
          temperature?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_qa?: Json | null
          created_at?: string
          desired_panels?: number | null
          id?: string
          memory_ids?: string[] | null
          photo_url?: string | null
          status?: string
          story_text?: string
          temperature?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      template_questions: {
        Row: {
          created_at: string
          follow_up_hints: string | null
          id: string
          order_index: number
          question_text: string
          question_type: string
          template_id: string
        }
        Insert: {
          created_at?: string
          follow_up_hints?: string | null
          id?: string
          order_index: number
          question_text: string
          question_type: string
          template_id: string
        }
        Update: {
          created_at?: string
          follow_up_hints?: string | null
          id?: string
          order_index?: number
          question_text?: string
          question_type?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "memory_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_template_progress: {
        Row: {
          completed_count: number
          id: string
          last_question_id: string | null
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_count?: number
          id?: string
          last_question_id?: string | null
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_count?: number
          id?: string
          last_question_id?: string | null
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_template_progress_last_question_id_fkey"
            columns: ["last_question_id"]
            isOneToOne: false
            referencedRelation: "template_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_template_progress_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "memory_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_all_user_stories: {
        Args: { p_user_id: string }
        Returns: undefined
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
    Enums: {},
  },
} as const
