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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
          error_code: string | null
          error_details: Json | null
          error_message: string
          error_stack: string | null
          function_name: string | null
          id: string
          metadata: Json | null
          request_data: Json | null
          service: string
          severity: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_code?: string | null
          error_details?: Json | null
          error_message: string
          error_stack?: string | null
          function_name?: string | null
          id?: string
          metadata?: Json | null
          request_data?: Json | null
          service: string
          severity?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_code?: string | null
          error_details?: Json | null
          error_message?: string
          error_stack?: string | null
          function_name?: string | null
          id?: string
          metadata?: Json | null
          request_data?: Json | null
          service?: string
          severity?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      operation_locks: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          lock_key: string
          metadata: Json | null
          operation_type: string
          started_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          lock_key: string
          metadata?: Json | null
          operation_type: string
          started_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          lock_key?: string
          metadata?: Json | null
          operation_type?: string
          started_at?: string
          user_id?: string | null
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
      request_idempotency: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          operation_type: string
          request_hash: string
          response_data: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          idempotency_key: string
          operation_type: string
          request_hash: string
          response_data?: Json | null
          status?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          operation_type?: string
          request_hash?: string
          response_data?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      saved_answers: {
        Row: {
          channel_id: string
          chat_session_id: string
          content: string
          created_at: string
          id: string
          message_id: string
          sources: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          chat_session_id: string
          content: string
          created_at?: string
          id?: string
          message_id: string
          sources?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          chat_session_id?: string
          content?: string
          created_at?: string
          id?: string
          message_id?: string
          sources?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_answers_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["channel_id"]
          },
          {
            foreignKeyName: "saved_answers_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_answers_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_usage: {
        Row: {
          created_at: string | null
          creators_added: number | null
          id: string
          last_message_date: string | null
          last_reset_at: string | null
          messages_sent_today: number | null
          messages_sent_total: number | null
          plan_expires_at: string | null
          plan_started_at: string | null
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
          last_reset_at?: string | null
          messages_sent_today?: number | null
          messages_sent_total?: number | null
          plan_expires_at?: string | null
          plan_started_at?: string | null
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
          last_reset_at?: string | null
          messages_sent_today?: number | null
          messages_sent_total?: number | null
          plan_expires_at?: string | null
          plan_started_at?: string | null
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
      acquire_operation_lock: {
        Args: {
          p_lock_key: string
          p_operation_type: string
          p_ttl_seconds?: number
          p_user_id: string
        }
        Returns: boolean
      }
      admin_get_active_creators: { Args: never; Returns: number }
      admin_get_active_users_today: { Args: never; Returns: number }
      admin_get_active_users_week: { Args: never; Returns: number }
      admin_get_avg_messages_per_user: { Args: never; Returns: number }
      admin_get_daily_messages: {
        Args: { days?: number }
        Returns: {
          date: string
          message_count: number
        }[]
      }
      admin_get_messages_month: { Args: never; Returns: number }
      admin_get_messages_today: { Args: never; Returns: number }
      admin_get_messages_week: { Args: never; Returns: number }
      admin_get_plan_distribution: {
        Args: never
        Returns: {
          plan_type: string
          user_count: number
        }[]
      }
      admin_get_recent_errors: {
        Args: { limit_count?: number }
        Returns: {
          created_at: string
          error_code: string
          error_message: string
          function_name: string
          id: string
          severity: string
        }[]
      }
      admin_get_top_creators: {
        Args: { limit_count?: number }
        Returns: {
          channel_id: string
          channel_name: string
          message_count: number
        }[]
      }
      admin_get_total_chunks: { Args: never; Returns: number }
      admin_get_total_creators: { Args: never; Returns: number }
      admin_get_total_users: { Args: never; Returns: number }
      admin_get_total_videos: { Args: never; Returns: number }
      admin_get_users_at_limit: { Args: never; Returns: number }
      check_idempotency: {
        Args: {
          p_idempotency_key: string
          p_operation_type: string
          p_request_hash: string
          p_ttl_seconds?: number
          p_user_id: string
        }
        Returns: {
          existing_response: Json
          existing_status: string
          is_duplicate: boolean
        }[]
      }
      complete_idempotency: {
        Args: {
          p_idempotency_key: string
          p_response_data: Json
          p_status?: string
        }
        Returns: undefined
      }
      decrement_creator_count: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string | null
          creators_added: number | null
          id: string
          last_message_date: string | null
          last_reset_at: string | null
          messages_sent_today: number | null
          messages_sent_total: number | null
          plan_expires_at: string | null
          plan_started_at: string | null
          plan_type: string | null
          updated_at: string | null
          user_id: string
          videos_indexed: number | null
        }
        SetofOptions: {
          from: "*"
          to: "user_usage"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_usage_with_limits: {
        Args: { p_user_id: string }
        Returns: {
          creators_added: number
          messages_sent_today: number
          plan_type: string
          videos_indexed: number
        }[]
      }
      get_user_channels: {
        Args: { p_user_id?: string }
        Returns: {
          avatar_url: string
          channel_id: string
          channel_name: string
          channel_url: string
          created_at: string
          id: string
          indexed_videos: number
          ingestion_progress: number
          ingestion_status: string
          subscriber_count: string
          total_videos: number
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      log_error: {
        Args: {
          p_error_code?: string
          p_error_message: string
          p_error_stack?: string
          p_function_name: string
          p_metadata?: Json
          p_request_data?: Json
          p_severity?: string
          p_user_id?: string
        }
        Returns: string
      }
      release_operation_lock: {
        Args: { p_lock_key: string }
        Returns: undefined
      }
      reset_daily_usage_if_needed: {
        Args: { p_user_id: string }
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
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
