export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      generated_ideas: {
        Row: {
          created_at: string;
          hook: string;
          id: string;
          pillar: string;
          run_id: string;
          thumbnail_text_glow: string;
          thumbnail_text_overlay: string;
          thumbnail_visual_description: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          hook: string;
          id?: string;
          pillar: string;
          run_id: string;
          thumbnail_text_glow: string;
          thumbnail_text_overlay: string;
          thumbnail_visual_description: string;
          title: string;
        };
        Update: {
          created_at?: string;
          hook?: string;
          id?: string;
          pillar?: string;
          run_id?: string;
          thumbnail_text_glow?: string;
          thumbnail_text_overlay?: string;
          thumbnail_visual_description?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generated_ideas_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "idea_generation_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      idea_generation_runs: {
        Row: {
          created_at: string;
          id: string;
          idea_count: number;
          topics: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          idea_count?: number;
          topics: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          idea_count?: number;
          topics?: string;
        };
        Relationships: [];
      };
      script_documents: {
        Row: {
          created_at: string;
          document: Json;
          episode_brief: string;
          id: string;
          working_title: string;
        };
        Insert: {
          created_at?: string;
          document: Json;
          episode_brief: string;
          id?: string;
          working_title: string;
        };
        Update: {
          created_at?: string;
          document?: Json;
          episode_brief?: string;
          id?: string;
          working_title?: string;
        };
        Relationships: [];
      };
      thumbnail_generation_events: {
        Row: {
          created_at: string;
          file_size_bytes: number | null;
          id: string;
          idea_id: string | null;
          local_relative_path: string | null;
          mime_type: string;
          sha256_hex: string | null;
        };
        Insert: {
          created_at?: string;
          file_size_bytes?: number | null;
          id?: string;
          idea_id?: string | null;
          local_relative_path?: string | null;
          mime_type?: string;
          sha256_hex?: string | null;
        };
        Update: {
          created_at?: string;
          file_size_bytes?: number | null;
          id?: string;
          idea_id?: string | null;
          local_relative_path?: string | null;
          mime_type?: string;
          sha256_hex?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "thumbnail_generation_events_idea_id_fkey";
            columns: ["idea_id"];
            isOneToOne: false;
            referencedRelation: "generated_ideas";
            referencedColumns: ["id"];
          },
        ];
      };
      narration_audio_segments: {
        Row: {
          act_id: string;
          block_index: number;
          created_at: string;
          file_size_bytes: number | null;
          id: string;
          local_relative_path: string;
          mime_type: string;
          sha256_hex: string | null;
          updated_at: string;
          video_id: string;
          working_title: string | null;
        };
        Insert: {
          act_id: string;
          block_index: number;
          created_at?: string;
          file_size_bytes?: number | null;
          id?: string;
          local_relative_path: string;
          mime_type?: string;
          sha256_hex?: string | null;
          updated_at?: string;
          video_id: string;
          working_title?: string | null;
        };
        Update: {
          act_id?: string;
          block_index?: number;
          created_at?: string;
          file_size_bytes?: number | null;
          id?: string;
          local_relative_path?: string;
          mime_type?: string;
          sha256_hex?: string | null;
          updated_at?: string;
          video_id?: string;
          working_title?: string | null;
        };
        Relationships: [];
      };
      vis_still_generation_events: {
        Row: {
          act_id: string;
          block_index: number;
          created_at: string;
          file_size_bytes: number | null;
          id: string;
          local_relative_path: string;
          mime_type: string;
          sha256_hex: string | null;
          updated_at: string;
          video_id: string;
          working_title: string | null;
        };
        Insert: {
          act_id: string;
          block_index: number;
          created_at?: string;
          file_size_bytes?: number | null;
          id?: string;
          local_relative_path: string;
          mime_type?: string;
          sha256_hex?: string | null;
          updated_at?: string;
          video_id: string;
          working_title?: string | null;
        };
        Update: {
          act_id?: string;
          block_index?: number;
          created_at?: string;
          file_size_bytes?: number | null;
          id?: string;
          local_relative_path?: string;
          mime_type?: string;
          sha256_hex?: string | null;
          updated_at?: string;
          video_id?: string;
          working_title?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
