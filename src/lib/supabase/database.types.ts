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
      narration_audio_segments: {
        Row: {
          act_id: string
          block_index: number
          created_at: string
          file_size_bytes: number | null
          id: string
          local_relative_path: string
          mime_type: string
          sha256_hex: string | null
          updated_at: string
          video_id: string
          working_title: string | null
        }
        Insert: {
          act_id: string
          block_index: number
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          local_relative_path: string
          mime_type?: string
          sha256_hex?: string | null
          updated_at?: string
          video_id: string
          working_title?: string | null
        }
        Update: {
          act_id?: string
          block_index?: number
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          local_relative_path?: string
          mime_type?: string
          sha256_hex?: string | null
          updated_at?: string
          video_id?: string
          working_title?: string | null
        }
        Relationships: []
      }
      vis_still_generation_events: {
        Row: {
          act_id: string
          block_index: number
          created_at: string
          file_size_bytes: number | null
          id: string
          local_relative_path: string
          mime_type: string
          sha256_hex: string | null
          updated_at: string
          video_id: string
          working_title: string | null
        }
        Insert: {
          act_id: string
          block_index: number
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          local_relative_path: string
          mime_type?: string
          sha256_hex?: string | null
          updated_at?: string
          video_id: string
          working_title?: string | null
        }
        Update: {
          act_id?: string
          block_index?: number
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          local_relative_path?: string
          mime_type?: string
          sha256_hex?: string | null
          updated_at?: string
          video_id?: string
          working_title?: string | null
        }
        Relationships: []
      }

      agent_logs: {
        Row: {
          action: string
          agent: string
          created_at: string
          id: number
          payload: Json
          project_id: string | null
        }
        Insert: {
          action: string
          agent: string
          created_at?: string
          id?: number
          payload?: Json
          project_id?: string | null
        }
        Update: {
          action?: string
          agent?: string
          created_at?: string
          id?: number
          payload?: Json
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          project_id: string | null
          source: string | null
          storage_path: string | null
          tags: string[] | null
          type: string
          url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          source?: string | null
          storage_path?: string | null
          tags?: string[] | null
          type: string
          url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          source?: string | null
          storage_path?: string | null
          tags?: string[] | null
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_prompts: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          is_active: boolean
          prompt_key: string
          prompt_text: string
          updated_at: string
          version: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          prompt_key: string
          prompt_text: string
          updated_at?: string
          version?: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          prompt_key?: string
          prompt_text?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_prompts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_suggestions: {
        Row: {
          channel_id: string | null
          created_at: string | null
          hook: string | null
          id: string
          project_id: string | null
          reasoning: string | null
          status: string | null
          thumbnail_blueprint: Json | null
          title: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          hook?: string | null
          id?: string
          project_id?: string | null
          reasoning?: string | null
          status?: string | null
          thumbnail_blueprint?: Json | null
          title: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          hook?: string | null
          id?: string
          project_id?: string | null
          reasoning?: string | null
          status?: string | null
          thumbnail_blueprint?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_suggestions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          banner_image_url: string | null
          characters: Json
          created_at: string
          default_mode: string
          generation_brief: string | null
          generation_profile: Json | null
          handle: string | null
          id: string
          music_preset: string
          name: string
          palette_hex: Json
          reference_urls: Json
          sfx_level: string
          style_keywords: Json
          template_family: string
          updated_at: string
          visual_donts: string | null
          visual_style_notes: string
          voice_id: string
          voice_speed: number
        }
        Insert: {
          banner_image_url?: string | null
          characters?: Json
          created_at?: string
          default_mode: string
          generation_brief?: string | null
          generation_profile?: Json | null
          handle?: string | null
          id: string
          music_preset: string
          name: string
          palette_hex?: Json
          reference_urls?: Json
          sfx_level: string
          style_keywords?: Json
          template_family: string
          updated_at?: string
          visual_donts?: string | null
          visual_style_notes?: string
          voice_id: string
          voice_speed?: number
        }
        Update: {
          banner_image_url?: string | null
          characters?: Json
          created_at?: string
          default_mode?: string
          generation_brief?: string | null
          generation_profile?: Json | null
          handle?: string | null
          id?: string
          music_preset?: string
          name?: string
          palette_hex?: Json
          reference_urls?: Json
          sfx_level?: string
          style_keywords?: Json
          template_family?: string
          updated_at?: string
          visual_donts?: string | null
          visual_style_notes?: string
          voice_id?: string
          voice_speed?: number
        }
        Relationships: []
      }
      drafts: {
        Row: {
          content: string | null
          created_at: string | null
          critic_notes: string | null
          critic_score: number | null
          hydration_stage: string | null
          id: string
          is_approved: boolean | null
          iteration: number
          messages: Json | null
          niche_data: string | null
          production_bundle: Json | null
          project_id: string | null
          prompt_context: string | null
          status: string | null
          suggestions: Json | null
          visual_cues: string | null
          yt_metadata: Json | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          critic_notes?: string | null
          critic_score?: number | null
          hydration_stage?: string | null
          id?: string
          is_approved?: boolean | null
          iteration: number
          messages?: Json | null
          niche_data?: string | null
          production_bundle?: Json | null
          project_id?: string | null
          prompt_context?: string | null
          status?: string | null
          suggestions?: Json | null
          visual_cues?: string | null
          yt_metadata?: Json | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          critic_notes?: string | null
          critic_score?: number | null
          hydration_stage?: string | null
          id?: string
          is_approved?: boolean | null
          iteration?: number
          messages?: Json | null
          niche_data?: string | null
          production_bundle?: Json | null
          project_id?: string | null
          prompt_context?: string | null
          status?: string | null
          suggestions?: Json | null
          visual_cues?: string | null
          yt_metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "drafts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_ideas: {
        Row: {
          created_at: string
          hook: string
          id: string
          pillar: string
          run_id: string
          suggested_tone: string
          suggested_visual_style: string
          thumbnail_text_glow: string
          thumbnail_text_overlay: string
          thumbnail_visual_description: string
          title: string
        }
        Insert: {
          created_at?: string
          hook: string
          id?: string
          pillar: string
          run_id: string
          suggested_tone?: string
          suggested_visual_style?: string
          thumbnail_text_glow: string
          thumbnail_text_overlay: string
          thumbnail_visual_description: string
          title: string
        }
        Update: {
          created_at?: string
          hook?: string
          id?: string
          pillar?: string
          run_id?: string
          suggested_tone?: string
          suggested_visual_style?: string
          thumbnail_text_glow?: string
          thumbnail_text_overlay?: string
          thumbnail_visual_description?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_ideas_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "idea_generation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_generation_runs: {
        Row: {
          created_at: string
          id: string
          idea_count: number
          topics: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_count?: number
          topics: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_count?: number
          topics?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          channel_id: string | null
          content_mode: string | null
          created_at: string | null
          id: string
          name: string
          niche_opportunities: Json | null
          original_idea: string
          status: string | null
          thumbnail_url: string | null
        }
        Insert: {
          channel_id?: string | null
          content_mode?: string | null
          created_at?: string | null
          id?: string
          name: string
          niche_opportunities?: Json | null
          original_idea: string
          status?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          channel_id?: string | null
          content_mode?: string | null
          created_at?: string | null
          id?: string
          name?: string
          niche_opportunities?: Json | null
          original_idea?: string
          status?: string | null
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      script_documents: {
        Row: {
          created_at: string
          document: Json
          episode_brief: string
          id: string
          working_title: string
        }
        Insert: {
          created_at?: string
          document: Json
          episode_brief: string
          id?: string
          working_title: string
        }
        Update: {
          created_at?: string
          document?: Json
          episode_brief?: string
          id?: string
          working_title?: string
        }
        Relationships: []
      }
      thumbnail_generation_events: {
        Row: {
          created_at: string
          file_size_bytes: number | null
          id: string
          idea_id: string | null
          local_relative_path: string | null
          mime_type: string
          sha256_hex: string | null
        }
        Insert: {
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          idea_id?: string | null
          local_relative_path?: string | null
          mime_type?: string
          sha256_hex?: string | null
        }
        Update: {
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          idea_id?: string | null
          local_relative_path?: string | null
          mime_type?: string
          sha256_hex?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "thumbnail_generation_events_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "generated_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          channel_id: string
          created_at: string
          duration_label: string | null
          id: string
          mode: string
          pipeline_unlocked: string
          sections: Json
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          duration_label?: string | null
          id: string
          mode: string
          pipeline_unlocked?: string
          sections?: Json
          status: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          duration_label?: string | null
          id?: string
          mode?: string
          pipeline_unlocked?: string
          sections?: Json
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
