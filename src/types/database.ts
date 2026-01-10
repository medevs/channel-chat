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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      channels: {
        Row: {
          avatar_url: string | null
          channel_id: string
          channel_name: string
          channel_url: string
          created_at: string | null
          error_message: string | null
          id: string
          indexed_videos: number | null
          ingest_lives: boolean | null
          ingest_shorts: boolean | null
          ingest_videos: boolean | null
          ingestion_method: string | null
          ingestion_progress: number | null
          ingestion_status: string | null
          last_indexed_at: string | null
          public_slug: string | null
          subscriber_count: string | null
          total_videos: number | null
          updated_at: string | null
          uploads_playlist_id: string | null
          video_import_limit: number | null
          video_import_mode: string | null
        }
        Insert: {
          avatar_url?: string | null
          channel_id: string
          channel_name: string
          channel_url: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          indexed_videos?: number | null
          ingest_lives?: boolean | null
          ingest_shorts?: boolean | null
          ingest_videos?: boolean | null
          ingestion_method?: string | null
          ingestion_progress?: number | null
          ingestion_status?: string | null
          last_indexed_at?: string | null
          public_slug?: string | null
          subscriber_count?: string | null
          total_videos?: number | null
          updated_at?: string | null
          uploads_playlist_id?: string | null
          video_import_limit?: number | null
          video_import_mode?: string | null
        }
        Update: {
          avatar_url?: string | null
          channel_id?: string
          channel_name?: string
          channel_url?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          indexed_videos?: number | null
          ingest_lives?: boolean | null
          ingest_shorts?: boolean | null
          ingest_videos?: boolean | null
          ingestion_method?: string | null
          ingestion_progress?: number | null
          ingestion_status?: string | null
          last_indexed_at?: string | null
          public_slug?: string | null
          subscriber_count?: string | null
          total_videos?: number | null
          updated_at?: string | null
          uploads_playlist_id?: string | null
          video_import_limit?: number | null
          video_import_mode?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          session_id: string
          sources: Json | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          session_id: string
          sources?: Json | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          session_id?: string
          sources?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          channel_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["channel_id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string | null
          error_details: Json | null
          error_message: string
          id: string
          service: string
        }
        Insert: {
          created_at?: string | null
          error_details?: Json | null
          error_message: string
          id?: string
          service: string
        }
        Update: {
          created_at?: string | null
          error_details?: Json | null
          error_message?: string
          id?: string
          service?: string
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
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      public_chat_limits: {
        Row: {
          channel_id: string
          created_at: string | null
          id: string
          identifier: string
          last_reset_at: string | null
          messages_today: number | null
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          id?: string
          identifier: string
          last_reset_at?: string | null
          messages_today?: number | null
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          id?: string
          identifier?: string
          last_reset_at?: string | null
          messages_today?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "public_chat_limits_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["channel_id"]
          },
        ]
      }
      transcript_chunks: {
        Row: {
          channel_id: string
          chunk_index: number
          created_at: string | null
          embedding: string | null
          embedding_status: string | null
          end_time: number | null
          id: string
          start_time: number | null
          text: string
          token_count: number | null
          transcript_id: string | null
          updated_at: string | null
          video_id: string
        }
        Insert: {
          channel_id: string
          chunk_index: number
          created_at?: string | null
          embedding?: string | null
          embedding_status?: string | null
          end_time?: number | null
          id?: string
          start_time?: number | null
          text: string
          token_count?: number | null
          transcript_id?: string | null
          updated_at?: string | null
          video_id: string
        }
        Update: {
          channel_id?: string
          chunk_index?: number
          created_at?: string | null
          embedding?: string | null
          embedding_status?: string | null
          end_time?: number | null
          id?: string
          start_time?: number | null
          text?: string
          token_count?: number | null
          transcript_id?: string | null
          updated_at?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_chunks_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["channel_id"]
          },
          {
            foreignKeyName: "transcript_chunks_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcript_chunks_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["video_id"]
          },
        ]
      }
      transcripts: {
        Row: {
          channel_id: string
          confidence: number | null
          created_at: string
          error_message: string | null
          extraction_status: string
          full_text: string | null
          id: string
          segments: Json | null
          source_type: string
          updated_at: string
          video_id: string
        }
        Insert: {
          channel_id: string
          confidence?: number | null
          created_at?: string
          error_message?: string | null
          extraction_status?: string
          full_text?: string | null
          id?: string
          segments?: Json | null
          source_type?: string
          updated_at?: string
          video_id: string
        }
        Update: {
          channel_id?: string
          confidence?: number | null
          created_at?: string
          error_message?: string | null
          extraction_status?: string
          full_text?: string | null
          id?: string
          segments?: Json | null
          source_type?: string
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["video_id"]
          },
        ]
      }
      user_creators: {
        Row: {
          channel_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_creators_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_usage: {
        Row: {
          created_at: string | null
          creators_added: number | null
          id: string
          last_message_date: string | null
          messages_sent_today: number | null
          plan_type: string | null
          updated_at: string | null
          user_id: string
          videos_indexed: number | null
        }
        Insert: {
          created_at?: string | null
          creators_added?: number | null
          id?: string
          last_message_date?: string | null
          messages_sent_today?: number | null
          plan_type?: string | null
          updated_at?: string | null
          user_id: string
          videos_indexed?: number | null
        }
        Update: {
          created_at?: string | null
          creators_added?: number | null
          id?: string
          last_message_date?: string | null
          messages_sent_today?: number | null
          plan_type?: string | null
          updated_at?: string | null
          user_id?: string
          videos_indexed?: number | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          channel_id: string
          comment_count: number | null
          content_type: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          duration_seconds: number | null
          id: string
          ingestion_method: string | null
          like_count: number | null
          published_at: string | null
          thumbnail_url: string | null
          title: string
          transcript_language: string | null
          transcript_status: string | null
          updated_at: string | null
          video_id: string
          view_count: number | null
        }
        Insert: {
          channel_id: string
          comment_count?: number | null
          content_type?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          duration_seconds?: number | null
          id?: string
          ingestion_method?: string | null
          like_count?: number | null
          published_at?: string | null
          thumbnail_url?: string | null
          title: string
          transcript_language?: string | null
          transcript_status?: string | null
          updated_at?: string | null
          video_id: string
          view_count?: number | null
        }
        Update: {
          channel_id?: string
          comment_count?: number | null
          content_type?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          duration_seconds?: number | null
          id?: string
          ingestion_method?: string | null
          like_count?: number | null
          published_at?: string | null
          thumbnail_url?: string | null
          title?: string
          transcript_language?: string | null
          transcript_status?: string | null
          updated_at?: string | null
          video_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["channel_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_usage_with_limits: {
        Args: { p_user_id: string }
        Returns: {
          creators_added: number
          messages_sent_today: number
          plan_type: string
          videos_indexed: number
        }[]
      }
      increment_creator_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      increment_message_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      increment_videos_indexed: {
        Args: { p_count: number; p_user_id: string }
        Returns: undefined
      }
      search_transcript_chunks: {
        Args: {
          filter_channel_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          channel_id: string
          chunk_index: number
          end_time: number
          id: string
          similarity: number
          start_time: number
          text: string
          video_id: string
        }[]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
