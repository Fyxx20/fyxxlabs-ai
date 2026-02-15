export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StoreGoal =
  | "sales"
  | "roas"
  | "conversion"
  | "traffic"
  | "trust"
  | "other";

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          website_url: string;
          goal: StoreGoal;
          platform: string;
          stage: string;
          traffic_source: string;
          aov_bucket: string;
          country: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          website_url: string;
          goal: StoreGoal;
          platform?: string;
          stage?: string;
          traffic_source?: string;
          aov_bucket?: string;
          country?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stores"]["Insert"]>;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          status: "trialing" | "active" | "past_due" | "canceled";
          trial_start: string;
          trial_end: string;
          advice_consumed: boolean;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: "free" | "starter" | "pro" | "elite" | "business" | "lifetime";
          current_period_end: string | null;
          ends_at: string | null;
          source: "stripe" | "manual";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: "trialing" | "active" | "past_due" | "canceled";
          trial_start: string;
          trial_end: string;
          advice_consumed?: boolean;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: "free" | "starter" | "pro" | "elite" | "business" | "lifetime";
          current_period_end?: string | null;
          ends_at?: string | null;
          source?: "stripe" | "manual";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
      };
      scans: {
        Row: {
          id: string;
          store_id: string;
          status: "queued" | "running" | "succeeded" | "failed";
          progress?: number;
          step?: string | null;
          started_at: string | null;
          finished_at: string | null;
          score_global: number | null;
          scores_json: Json | null;
          issues_json: Json | null;
          trial_single_advice: string | null;
          scan_data_json: Json | null;
          summary: string | null;
          error_message: string | null;
          error_code?: string | null;
          debug?: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          status?: "queued" | "running" | "succeeded" | "failed";
          progress?: number;
          step?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          score_global?: number | null;
          scores_json?: Json | null;
          issues_json?: Json | null;
          trial_single_advice?: string | null;
          scan_data_json?: Json | null;
          summary?: string | null;
          error_message?: string | null;
          error_code?: string | null;
          debug?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scans"]["Insert"]>;
      };
      scan_events: {
        Row: {
          id: number;
          scan_id: string;
          ts: string;
          type: string;
          message: string;
          payload: Json | null;
        };
        Insert: {
          id?: number;
          scan_id: string;
          ts?: string;
          type?: string;
          message: string;
          payload?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["scan_events"]["Insert"]>;
      };
      coach_messages: {
        Row: {
          id: string;
          store_id: string;
          user_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          user_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["coach_messages"]["Insert"]>;
      };
      user_onboarding: {
        Row: {
          user_id: string;
          completed: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          completed?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_onboarding"]["Insert"]>;
      };
      audit_events: {
        Row: {
          id: string;
          user_id: string;
          store_id: string | null;
          type: string;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id?: string | null;
          type: string;
          payload?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_events"]["Insert"]>;
      };
      generation_jobs: {
        Row: {
          id: string;
          user_id: string;
          store_id: string | null;
          job_kind: "physical_create" | "digital_create" | "scan_optimize";
          source: "builder" | "scan" | "api";
          status: "queued" | "running" | "succeeded" | "failed" | "canceled";
          step: string | null;
          progress: number;
          input_payload: Json;
          output_payload: Json;
          error_message: string | null;
          created_at: string;
          started_at: string | null;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id?: string | null;
          job_kind: "physical_create" | "digital_create" | "scan_optimize";
          source?: "builder" | "scan" | "api";
          status?: "queued" | "running" | "succeeded" | "failed" | "canceled";
          step?: string | null;
          progress?: number;
          input_payload?: Json;
          output_payload?: Json;
          error_message?: string | null;
          created_at?: string;
          started_at?: string | null;
          finished_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["generation_jobs"]["Insert"]>;
      };
      digital_assets: {
        Row: {
          id: string;
          user_id: string;
          store_id: string | null;
          asset_kind: "ebook" | "template" | "course" | "bundle" | "other";
          title: string;
          file_path: string;
          file_name: string;
          mime_type: string;
          file_size_bytes: number;
          checksum_sha256: string | null;
          visibility: "private";
          status: "uploaded" | "processing" | "ready" | "archived" | "failed";
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id?: string | null;
          asset_kind?: "ebook" | "template" | "course" | "bundle" | "other";
          title: string;
          file_path: string;
          file_name: string;
          mime_type: string;
          file_size_bytes: number;
          checksum_sha256?: string | null;
          visibility?: "private";
          status?: "uploaded" | "processing" | "ready" | "archived" | "failed";
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["digital_assets"]["Insert"]>;
      };
      digital_deliveries: {
        Row: {
          id: string;
          user_id: string;
          asset_id: string;
          order_ref: string | null;
          customer_email: string;
          signed_url: string | null;
          expires_at: string | null;
          delivered_at: string | null;
          download_count: number;
          max_downloads: number;
          status: "pending" | "sent" | "opened" | "expired" | "revoked" | "failed";
          provider_message_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          asset_id: string;
          order_ref?: string | null;
          customer_email: string;
          signed_url?: string | null;
          expires_at?: string | null;
          delivered_at?: string | null;
          download_count?: number;
          max_downloads?: number;
          status?: "pending" | "sent" | "opened" | "expired" | "revoked" | "failed";
          provider_message_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["digital_deliveries"]["Insert"]>;
      };
      image_optimizations: {
        Row: {
          id: string;
          user_id: string;
          store_id: string | null;
          scan_id: string | null;
          context: "physical_builder" | "digital_builder" | "scan" | "manual";
          source_image_url: string;
          output_image_url: string | null;
          operations: Json;
          provider: string | null;
          quality_score_before: number | null;
          quality_score_after: number | null;
          status: "queued" | "running" | "succeeded" | "failed";
          error_message: string | null;
          created_at: string;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id?: string | null;
          scan_id?: string | null;
          context: "physical_builder" | "digital_builder" | "scan" | "manual";
          source_image_url: string;
          output_image_url?: string | null;
          operations?: Json;
          provider?: string | null;
          quality_score_before?: number | null;
          quality_score_after?: number | null;
          status?: "queued" | "running" | "succeeded" | "failed";
          error_message?: string | null;
          created_at?: string;
          finished_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["image_optimizations"]["Insert"]>;
      };
      pricing_explanations: {
        Row: {
          id: string;
          user_id: string;
          store_id: string | null;
          context: "physical_builder" | "digital_builder" | "scan";
          product_title: string;
          currency: string;
          source_cost: number | null;
          competitor_low: number | null;
          competitor_avg: number | null;
          competitor_high: number | null;
          suggested_safe: number;
          suggested_optimal: number;
          suggested_aggressive: number;
          min_margin_pct: number | null;
          optimal_margin_pct: number | null;
          psychological_ending: string | null;
          positioning: "low" | "mid" | "premium" | null;
          rationale: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id?: string | null;
          context: "physical_builder" | "digital_builder" | "scan";
          product_title: string;
          currency?: string;
          source_cost?: number | null;
          competitor_low?: number | null;
          competitor_avg?: number | null;
          competitor_high?: number | null;
          suggested_safe: number;
          suggested_optimal: number;
          suggested_aggressive: number;
          min_margin_pct?: number | null;
          optimal_margin_pct?: number | null;
          psychological_ending?: string | null;
          positioning?: "low" | "mid" | "premium" | null;
          rationale?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pricing_explanations"]["Insert"]>;
      };
    };
  };
}
